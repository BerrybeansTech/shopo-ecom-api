const { sequelize } = require("../config/db.js");
const { tenantConnections } = require("../config/tenantManager.js");

const getHealth = async (req, res) => {
  try {
    const buildInfo = {
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    const tenantStats = Object.keys(tenantConnections).map((orgId) => {
      const tenantDb = tenantConnections[orgId];
      return {
        orgId,
        connected: !!tenantDb,
      };
    });

    res.json({
      status: "ok",
      buildInfo,
      tenants: tenantStats,
      sharedDbConnected: true,
    });
  } catch (err) {
    console.error("health check error:", err);
    res.status(500).json({ status: "error" });
  }
};

module.exports = { getHealth };
