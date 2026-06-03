import NodeClam from 'clamscan';

let clamInstance = null;

const getClamInstance = async () => {
    if (clamInstance) return clamInstance;
    clamInstance = await new NodeClam().init({
        clamdscan: {
            active: true,
            socket: process.env.CLAMAV_SOCKET || '/var/run/clamav/clamd.ctl',
            timeout: 60000,
        },
        preference: 'clamdscan',
    });
    return clamInstance;
};

/**
 * Scans a Buffer for malware using ClamAV.
 *
 * When NODE_CLAMSCAN_ENABLED is not 'true', the scan is skipped (dev/test mode).
 * When enabled, requires a running ClamAV daemon (clamd).
 *
 * @param {Buffer} buffer - The file buffer to scan
 * @returns {Promise<boolean>} true if clean, throws Error if infected
 */
export const scanBuffer = async (buffer) => {
    if (process.env.NODE_CLAMSCAN_ENABLED !== 'true') {
        return true; // Skip scan in development
    }

    const clam = await getClamInstance();
    const { isInfected, viruses } = await clam.scanBuffer(buffer);

    if (isInfected) {
        const virusNames = (viruses || []).join(', ') || 'unknown';
        console.warn(`[SECURITY] Infected upload rejected. Threats: ${virusNames}`);
        throw new Error('File failed security scan and was rejected');
    }

    return true;
};
