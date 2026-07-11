const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wedding2026';
const AUTO_APPROVE = process.env.AUTO_APPROVE === 'true' || true; // Set to true to approve photos automatically

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Cloudinary Configuration
const isCloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && 
                                process.env.CLOUDINARY_API_KEY && 
                                process.env.CLOUDINARY_API_SECRET);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary configured successfully.');
} else {
  console.log('Cloudinary credentials missing. Defaulting to local storage.');
}

// Database Setup (MongoDB Atlas with SQLite Fallback)
const useMongoDB = !!process.env.MONGODB_URI;
let db;
let PhotoModel;

if (useMongoDB) {
  mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 15,
    minPoolSize: 5
  })
    .then(() => console.log('Connected to MongoDB Atlas successfully.'))
    .catch(err => {
      console.error('MongoDB connection failed. Please check MONGODB_URI.', err);
      process.exit(1);
    });

  const photoSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    uploader_name: { type: String, default: 'Anonymous Guest' },
    filename: String,
    filepath: { type: String, required: true },
    cloudinary_public_id: String,
    created_at: { type: Date, default: Date.now },
    approved: { type: Number, default: 1 }
  });
  PhotoModel = mongoose.model('Photo', photoSchema);
} else {
  // SQLite Setup fallback
  (async () => {
    db = await open({
      filename: path.join(__dirname, 'database.sqlite'),
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS photos (
        id TEXT PRIMARY KEY,
        uploader_name TEXT,
        filename TEXT,
        filepath TEXT,
        cloudinary_public_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved INTEGER DEFAULT 1
      )
    `);

    try {
      await db.exec('ALTER TABLE photos ADD COLUMN cloudinary_public_id TEXT');
    } catch (e) {
      // Column already exists
    }
    console.log('SQLite database initialized.');
  })();
}

// Rate limiting for uploads to prevent abuse
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : parseInt(process.env.UPLOAD_LIMIT_MAX || '30'), // Limit each IP per windowMs
  message: { error: 'Too many uploads from this IP, please try again later.' }
});

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|heic/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF, WEBP, HEIC) are allowed!'));
  }
});

// Authentication middleware (Simple token check)
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token === `Bearer ${ADMIN_PASSWORD}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Invalid admin token.' });
  }
};

// API Routes

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: `Bearer ${ADMIN_PASSWORD}` });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Config endpoint to expose public Cloudinary params
app.get('/api/config', (req, res) => {
  res.json({
    cloudinaryCloudName: isCloudinaryConfigured ? process.env.CLOUDINARY_CLOUD_NAME : null,
    cloudinaryUploadPreset: isCloudinaryConfigured ? (process.env.CLOUDINARY_UPLOAD_PRESET || 'wedding_preset') : null
  });
});

// Upload Photo
app.post('/api/upload', uploadLimiter, (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.single('photo')(req, res, next);
  } else {
    next();
  }
}, async (req, res) => {
  try {
    const { uploader_name } = req.body;
    const id = uuidv4();
    const approved = AUTO_APPROVE ? 1 : 0;

    let filepath;
    let filename = null;
    let cloudinary_public_id = null;

    // Case 1: Direct Cloudinary Upload from Frontend
    if (req.body.filepath) {
      filepath = req.body.filepath;
      cloudinary_public_id = req.body.cloudinary_public_id || null;
      filename = cloudinary_public_id ? `${cloudinary_public_id.split('/').pop()}.jpg` : 'cloudinary_image.jpg';
    } 
    // Case 2: Fallback direct file upload to backend
    else {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      filename = req.file.filename;
      filepath = `/uploads/${filename}`;

      if (isCloudinaryConfigured) {
        try {
          const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: 'wedding_gallery'
          });
          filepath = uploadResult.secure_url;
          cloudinary_public_id = uploadResult.public_id;
          
          // Clean up temporary local file
          fs.unlinkSync(req.file.path);
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed, using local storage fallback:', cloudinaryError);
        }
      }
    }

    if (useMongoDB) {
      const newPhoto = new PhotoModel({
        id,
        uploader_name: uploader_name || 'Anonymous Guest',
        filename,
        filepath,
        cloudinary_public_id,
        approved
      });
      await newPhoto.save();
    } else {
      await db.run(
        'INSERT INTO photos (id, uploader_name, filename, filepath, cloudinary_public_id, approved) VALUES (?, ?, ?, ?, ?, ?)',
        [id, uploader_name || 'Anonymous Guest', filename, filepath, cloudinary_public_id, approved]
      );
    }

    res.status(201).json({
      message: 'Photo uploaded successfully!',
      photo: { id, uploader_name, filepath, approved }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to upload photo' });
  }
});

// Get Photos
app.get('/api/photos', async (req, res) => {
  try {
    const showAll = req.query.admin === 'true';
    let photos;
    
    if (showAll) {
      const token = req.headers['authorization'];
      if (token !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }
      if (useMongoDB) {
        photos = await PhotoModel.find().sort({ created_at: -1 }).lean();
      } else {
        photos = await db.all('SELECT * FROM photos ORDER BY created_at DESC');
      }
    } else {
      if (useMongoDB) {
        photos = await PhotoModel.find({ approved: 1 }).sort({ created_at: -1 }).lean();
      } else {
        photos = await db.all('SELECT * FROM photos WHERE approved = 1 ORDER BY created_at DESC');
      }
    }
    
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve photos' });
  }
});

// Toggle Approval
app.patch('/api/photos/:id/approve', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    if (useMongoDB) {
      await PhotoModel.updateOne({ id }, { approved });
    } else {
      await db.run('UPDATE photos SET approved = ? WHERE id = ?', [approved, id]);
    }
    res.json({ message: `Photo approval status updated to ${approved}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update approval status' });
  }
});

// Delete Photo
app.delete('/api/photos/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    let photo;
    if (useMongoDB) {
      photo = await PhotoModel.findOne({ id }).lean();
    } else {
      photo = await db.get('SELECT filename, filepath, cloudinary_public_id FROM photos WHERE id = ?', id);
    }
    
    if (photo) {
      if (photo.cloudinary_public_id) {
        try {
          await cloudinary.uploader.destroy(photo.cloudinary_public_id);
        } catch (cloudinaryDelError) {
          console.error('Failed to delete from Cloudinary:', cloudinaryDelError);
        }
      } else if (photo.filename) {
        const fileFullPath = path.join(uploadsDir, photo.filename);
        if (fs.existsSync(fileFullPath)) {
          fs.unlinkSync(fileFullPath);
        }
      }
      
      if (useMongoDB) {
        await PhotoModel.deleteOne({ id });
      } else {
        await db.run('DELETE FROM photos WHERE id = ?', id);
      }
      res.json({ message: 'Photo deleted successfully' });
    } else {
      res.status(404).json({ error: 'Photo not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
