const axios = require('axios');

const SHIPROCKET_API_URL = 'https://apiv2.shiprocket.in/v1/external';

const loginShiprocket = async () => {
    try {
        console.log("🔐 [Shiprocket] Authenticating with email:", process.env.SHIPROCKET_EMAIL);
        
        const response = await axios.post(`${SHIPROCKET_API_URL}/auth/login`, {
            email: process.env.SHIPROCKET_EMAIL,
            password: process.env.SHIPROCKET_PASSWORD
        });

        console.log("✅ [Shiprocket] Login Successful");
        console.log("🪪 [Shiprocket] Token received:", !!response.data.token);

        return response.data.token;
    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error("❌ [Shiprocket] Login Error:", JSON.stringify(errorDetail, null, 2));
        throw new Error('Failed to authenticate with Shiprocket');
    }
};

const createShipment = async (orderData) => {
    try {
        const token = await loginShiprocket();
        console.log("📡 [Shiprocket] Sending Shipment Creation Request...");
        
        const response = await axios.post(`${SHIPROCKET_API_URL}/orders/create/adhoc`, orderData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log("✅ [Shiprocket] Shipment Created Successfully!");
        console.log("📦 [Shiprocket] Response:", JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        const errorDetail = error.response?.data || error.message;
        console.error("❌ [Shiprocket] Shipment Error:", JSON.stringify(errorDetail, null, 2));
        throw error;
    }
};

const trackShipment = async (shipmentId) => {
    try {
        const token = await loginShiprocket();
        const response = await axios.get(`${SHIPROCKET_API_URL}/courier/track/shipment/${shipmentId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Shiprocket Tracking Error:', error.response?.data || error.message);
        throw error;
    }
};

const cancelShipment = async (shipmentIds) => {
    try {
        const token = await loginShiprocket();
        const response = await axios.post(`${SHIPROCKET_API_URL}/orders/cancel/shipment/external`, {
            shipment_ids: shipmentIds
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Shiprocket Cancel Error:', error.response?.data || error.message);
        throw error;
    }
};

const checkServiceability = async (params) => {
    try {
        const token = await loginShiprocket();
        console.log("📡 [Shiprocket] Checking serviceability for params:", params);
        
        const response = await axios.get(`${SHIPROCKET_API_URL}/courier/serviceability/`, {
            params,
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (error) {
        console.error('Shiprocket Serviceability Error:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = {
    loginShiprocket,
    createShipment,
    trackShipment,
    cancelShipment,
    checkServiceability
};
