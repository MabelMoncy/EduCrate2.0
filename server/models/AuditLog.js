import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: ['DELETE', 'UPDATE', 'CREATE'],
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        resourceTitle: {
            type: String,
            required: true,
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        performedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { collection: 'auditlogs' }
);

// Auto-expire records after 1 year (365 days)
auditLogSchema.index(
    { performedAt: 1 },
    { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
