/**
 * Physics Constants for Engine V3
 */
export const Physics = {
    METERS_PER_DEGREE: 111319.9,
    KTS_TO_MPS: 0.514444,
    MPS_TO_KTS: 1.94384,
    RAD_TO_DEG: 180 / Math.PI,
    DEG_TO_RAD: Math.PI / 180,
    GRAVITY_G: 9.80665,
    KM_TO_M: 1000,
    CEP_INITIAL_RADIUS_M: 50,
    TRACK_CONFIDENCE_DEFAULT: 1.0,
    TRACK_POSITION_ALPHA: 0.3, // Kalman-lite smoothing
    TRACK_TIMEOUT_TICKS: 50,
    DEFAULT_SENSOR_RANGE_M: 100000,
    DEFAULT_AMBIENT_NOISE_DB: 60,
    ACOUSTIC_REFERENCE_DT_DB: 10.0,
    RADAR_MIN_SNR_DB: 10.0,
    RADAR_TX_POWER_DBM: 60.0, // 1 MW
    RADAR_GAIN_DBI: 35.0,
    NOISE_FLOOR_DBM: -110.0,
    LIGHT_SPEED: 299792458,
    
    // WGS-84 Ellipsoid
    WGS84_SEMI_MAJOR_AXIS: 6378137.0,      // a (meters)
    WGS84_FLATTENING: 1 / 298.257223563,  // f
    WGS84_SEMI_MINOR_AXIS: 6356752.3142,   // b = a(1-f)
    EARTH_RADIUS_MEAN: 6371000,           // R (meters)
    
    // Subsurface (Acoustic)
    SONAR_DT_DB: 10.0,
    WATER_SPEED_SOUND: 1500, // m/s
    SURFACE_LAYER_DEPTH_M: 100,
    AMBIENT_OCEAN_NOISE_DB: 60.0,
    
    // Orbital
    EARTH_MU: 3.986004418e14, // m^3/s^2
};
