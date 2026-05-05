import Resource from '../models/Resource.js';
import supabase from '../config/supabase.js';

// @desc    Get all resources
// @route   GET /api/resources
// @access  Private
const getResources = async (req, res, next) => {
  try {
    const resources = await Resource.find({}).sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a new resource
// @route   POST /api/resources
// @access  Private
const uploadResource = async (req, res, next) => {
  try {
    const { title, description, semester, subject } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400);
      throw new Error('Please upload a PDF file');
    }

    if (!supabase) {
      res.status(500);
      throw new Error('Supabase integration not configured');
    }

    // Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('resources') // Assumes a bucket named 'resources' exists
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      res.status(500);
      throw new Error('Failed to upload file to storage');
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(fileName);

    const resource = await Resource.create({
      title,
      description,
      semester,
      subject,
      fileUrl: publicUrl,
      fileType: 'pdf',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedBy: req.user.email || req.user.id,
    });

    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
};

export { getResources, uploadResource };
