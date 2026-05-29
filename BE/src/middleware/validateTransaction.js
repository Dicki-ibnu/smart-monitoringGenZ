const Joi = require('joi');

const transactionSchema = Joi.object({
    amount: Joi.number().positive().required(),
    category: Joi.string().required(),
    description: Joi.string().allow('', null),
    date: Joi.date().iso().required(),
    is_ocr: Joi.boolean().default(false),
    image_url: Joi.string().uri().allow('', null) 
});

const validateTransaction = (req, res, next) => {
    const { error } = transactionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

module.exports = validateTransaction;