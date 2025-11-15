const Joi = require('joi');

const createSchema = Joi.object({
  kode: Joi.string().max(50).required(),
  nama: Joi.string().max(191).required(),
  color: Joi.string().max(20).optional().allow(null, ''),
  // logo di-handle oleh multipart (multer) sehingga tidak divalidasi di sini
});

const updateSchema = Joi.object({
  kode: Joi.string().max(50).optional(),
  nama: Joi.string().max(191).optional(),
  color: Joi.string().max(20).optional().allow(null, '')
});

module.exports = { createSchema, updateSchema };
