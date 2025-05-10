const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'domeism2e',
  api_key: '998498653144579',
  api_secret: 'D5Yhbg_cxIqcBLUDMYgxTlP-CTc',
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'electronics-store',
    allowed_formats: ['jpg', 'png'],
  },
});

module.exports = { cloudinary, storage };
