import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOOKING_SERVICE_TYPES = ["hotel", "cab", "activity", "transfer", "other"];
const BOOKING_SERVICE_STATUSES = [
  "pending",
  "confimed",
  "completed",
  "cancelled",
];
const MEAL_PLANS = ["ep", "cp", "map", "ap"];
const TRIP_TYPES = ["transfer", "loacal", "point-to-point", "multi-day"];
const CAB_SERVICE_STATUSES = ["draft", "issued", "cancelled"];
const PHONE_REGEX = /^[6-9]\d{9}$/;

export const createBookingService = async (req, res) => {
  const {
    organization_id,
    supplier_id,
    service_type,
    service_name,
    service_date,
    start_date,
    end_date,
    selling_price,
    supplier_cost,
    confirmation_number,
    supplier_reference,
    status,
    notes,
  } = req.body;

  try {
    if (
      !organization_id ||
      !service_type ||
      !service_name ||
      selling_price === undefined ||
      supplier_cost === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, service_type, service_name, selling_price, and supplier_cost are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (supplier_id && !UUID_REGEX.test(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (!BOOKING_SERVICE_TYPES.includes(service_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service_type. Allowed: ${BOOKING_SERVICE_TYPES.join(", ")}`,
      });
    }

    const statusValue = status ?? "pending";
    if (!BOOKING_SERVICE_STATUSES.includes(statusValue)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${BOOKING_SERVICE_STATUSES.join(", ")}`,
      });
    }

    if (selling_price < 0 || supplier_cost < 0) {
      return res.status(400).json({
        success: false,
        message: "selling_price and supplier_cost must be non-negative.",
      });
    }

    if (
      start_date &&
      end_date &&
      new Date(end_date) < new Date(start_date)
    ) {
      return res.status(400).json({
        success: false,
        message: "end_date must be on or after start_date.",
      });
    }

    const result = await pool.query(
      `INSERT INTO booking_services
       (organization_id, supplier_id, service_type, service_name, service_date, start_date, end_date, selling_price, supplier_cost, confirmation_number, supplier_reference, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        organization_id,
        supplier_id || null,
        service_type,
        service_name,
        service_date || null,
        start_date || null,
        end_date || null,
        selling_price,
        supplier_cost,
        confirmation_number || null,
        supplier_reference || null,
        statusValue,
        notes || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Booking service created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getAllBookingServices = async (req, res) => {
  const { organization_id, supplier_id, service_type, status } = req.query;
  try {
    let query = `SELECT * FROM booking_services WHERE 1=1`;
    const params = [];

    if (organization_id) {
      if (!UUID_REGEX.test(organization_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID.",
        });
      }
      params.push(organization_id);
      query += ` AND organization_id = $${params.length}`;
    }

    if (supplier_id) {
      if (!UUID_REGEX.test(supplier_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid supplier ID.",
        });
      }
      params.push(supplier_id);
      query += ` AND supplier_id = $${params.length}`;
    }

    if (service_type) {
      params.push(service_type);
      query += ` AND service_type = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY service_date DESC NULLS LAST`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Booking services fetched successfully.",
      data: result.rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getBookingServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const serviceResult = await pool.query(
      `SELECT * FROM booking_services WHERE id = $1`,
      [id],
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking service not found.",
      });
    }

    const hotelDetails = await pool.query(
      `SELECT * FROM hotel_service_details WHERE booking_service_id = $1`,
      [id],
    );

    const cabDetails = await pool.query(
      `SELECT * FROM cab_service_details WHERE booking_service_id = $1`,
      [id],
    );

    const voucher = await pool.query(
      `SELECT * FROM service_voucher WHERE booking_service_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Booking service fetched successfully.",
      data: {
        ...serviceResult.rows[0],
        hotel_details: hotelDetails.rows[0] || null,
        cab_details: cabDetails.rows[0] || null,
        voucher: voucher.rows[0] || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const updateBookingService = async (req, res) => {
  const { id } = req.params;
  const {
    supplier_id,
    service_name,
    service_date,
    start_date,
    end_date,
    selling_price,
    supplier_cost,
    confirmation_number,
    supplier_reference,
    status,
    notes,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    if (supplier_id && !UUID_REGEX.test(supplier_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid supplier ID.",
      });
    }

    if (status && !BOOKING_SERVICE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${BOOKING_SERVICE_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE booking_services
       SET supplier_id = COALESCE($1, supplier_id),
           service_name = COALESCE($2, service_name),
           service_date = COALESCE($3, service_date),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           selling_price = COALESCE($6, selling_price),
           supplier_cost = COALESCE($7, supplier_cost),
           confirmation_number = COALESCE($8, confirmation_number),
           supplier_reference = COALESCE($9, supplier_reference),
           status = COALESCE($10, status),
           notes = COALESCE($11, notes)
       WHERE id = $12
       RETURNING *`,
      [
        supplier_id ?? null,
        service_name ?? null,
        service_date ?? null,
        start_date ?? null,
        end_date ?? null,
        selling_price ?? null,
        supplier_cost ?? null,
        confirmation_number ?? null,
        supplier_reference ?? null,
        status ?? null,
        notes ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking service updated successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const deleteBookingService = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid service ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM booking_services WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking service not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking service deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const addHotelDetails = async (req, res) => {
  const { id } = req.params;
  const {
    hotel_name,
    room_category,
    meal_plan,
    rooms,
    adults,
    children,
    check_in,
    check_out,
    extra_beds,
    confirmation_number,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking service ID.",
      });
    }

    if (!hotel_name || !check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: "hotel_name, check_in, and check_out are required.",
      });
    }

    const meal = meal_plan ?? "cp";
    if (!MEAL_PLANS.includes(meal)) {
      return res.status(400).json({
        success: false,
        message: `Invalid meal_plan. Allowed: ${MEAL_PLANS.join(", ")}`,
      });
    }

    const result = await pool.query(
      `INSERT INTO hotel_service_details
       (booking_service_id, hotel_name, room_category, meal_plan, rooms, adults, children, check_in, check_out, extra_beds, confirmation_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        hotel_name,
        room_category || null,
        meal,
        rooms || 1,
        adults || 1,
        children || 0,
        check_in,
        check_out,
        extra_beds || 0,
        confirmation_number || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Hotel service details added successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const addServiceVoucher = async (req, res) => {
  const { id } = req.params;
  const {
    vehicle_type,
    vehicle_number,
    driver_name,
    driver_phone,
    pickup_location,
    drop_location,
    pickup_time,
    trip_type,
    distance_km,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking service ID.",
      });
    }

    if (trip_type && !TRIP_TYPES.includes(trip_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid trip_type. Allowed: ${TRIP_TYPES.join(", ")}`,
      });
    }

    if (driver_phone && !PHONE_REGEX.test(driver_phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid 10-digit phone starting with 6-9.",
      });
    }

    const result = await pool.query(
      `INSERT INTO service_voucher
       (booking_service_id, vehicle_type, vehicle_number, driver_name, driver_phone, pickup_location, drop_location, pickup_time, trip_type, distance_km)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        vehicle_type || null,
        vehicle_number ? vehicle_number.toUpperCase() : null,
        driver_name || null,
        driver_phone || null,
        pickup_location || null,
        drop_location || null,
        pickup_time || null,
        trip_type || null,
        distance_km || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Service voucher created successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
