import { pool } from "../../config/db.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
];
const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];
const GUEST_TYPES = ["adult", "child", "infant"];
const GENDER_TYPES = ["male", "female", "other", "unspecified"];
const CANCELLATION_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "completed",
];
const PHONE_REGEX = /^[6-9]\d{9}$/;

export const createBooking = async (req, res) => {
  const {
    organization_id,
    branch_id,
    booking_number,
    customer_id,
    qoutation_id,
    package_id,
    assign_to,
    booking_date,
    check_in,
    check_out,
    adults,
    children,
    infants,
    pickup_location,
    drop_location,
    subtotal,
    discount,
    tax_amount,
    final_amount,
    currency,
    booking_status,
    payment_status,
    internal_notes,
    guests,
  } = req.body;

  try {
    if (
      !organization_id ||
      !booking_number ||
      !customer_id ||
      !booking_date ||
      adults === undefined ||
      children === undefined ||
      infants === undefined ||
      subtotal === undefined ||
      discount === undefined ||
      tax_amount === undefined ||
      final_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, booking_number, customer_id, booking_date, adults, children, infants, subtotal, discount, tax_amount, and final_amount are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    if (branch_id && !UUID_REGEX.test(branch_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    if (qoutation_id && !UUID_REGEX.test(qoutation_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation ID.",
      });
    }

    if (package_id && !UUID_REGEX.test(package_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid package ID.",
      });
    }

    if (assign_to && !UUID_REGEX.test(assign_to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assign_to user ID.",
      });
    }

    const bStatus = booking_status ?? "pending";
    if (!BOOKING_STATUSES.includes(bStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid booking_status. Allowed: ${BOOKING_STATUSES.join(", ")}`,
      });
    }

    const pStatus = payment_status ?? "unpaid";
    if (!PAYMENT_STATUSES.includes(pStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_status. Allowed: ${PAYMENT_STATUSES.join(", ")}`,
      });
    }

    const existing = await pool.query(
      `SELECT id FROM bookings WHERE organization_id = $1 AND booking_number = $2`,
      [organization_id, booking_number],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Booking number already exists for this organization.",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const bookingResult = await client.query(
        `INSERT INTO bookings
         (organization_id, branch_id, booking_number, customer_id, qoutation_id, package_id, assign_to, booking_date, check_in, check_out, adults, children, infants, pickup_location, drop_location, subtotal, discount, tax_amount, final_amount, currency, booking_status, payment_status, internal_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         RETURNING *`,
        [
          organization_id,
          branch_id || null,
          booking_number,
          customer_id,
          qoutation_id || null,
          package_id || null,
          assign_to || null,
          booking_date,
          check_in || null,
          check_out || null,
          adults,
          children,
          infants,
          pickup_location || null,
          drop_location || null,
          subtotal,
          discount,
          tax_amount,
          final_amount,
          currency ? currency.toLowerCase() : "inr",
          bStatus,
          pStatus,
          internal_notes || null,
        ],
      );

      const booking = bookingResult.rows[0];
      const insertedGuests = [];

      if (Array.isArray(guests) && guests.length > 0) {
        for (const guest of guests) {
          if (!guest.full_name) continue;

          const gType = guest.guest_type ?? "adult";
          const genderVal = guest.gender || null;

          const guestResult = await client.query(
            `INSERT INTO booking_guests
             (organization_id, booking_id, full_name, age, gender, guest_type, phone, document_type, document_number_encrypted)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
              organization_id,
              booking.id,
              guest.full_name,
              guest.age || null,
              genderVal,
              gType,
              guest.phone || null,
              guest.document_type || null,
              guest.document_number_encrypted || null,
            ],
          );
          insertedGuests.push(guestResult.rows[0]);
        }
      }

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Booking created successfully.",
        data: {
          ...booking,
          guests: insertedGuests,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const getAllBookings = async (req, res) => {
  const { organization_id, customer_id, booking_status, payment_status } =
    req.query;
  try {
    let query = `SELECT * FROM bookings WHERE 1=1`;
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

    if (customer_id) {
      if (!UUID_REGEX.test(customer_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID.",
        });
      }
      params.push(customer_id);
      query += ` AND customer_id = $${params.length}`;
    }

    if (booking_status) {
      params.push(booking_status);
      query += ` AND booking_status = $${params.length}`;
    }

    if (payment_status) {
      params.push(payment_status);
      query += ` AND payment_status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully.",
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

export const getBookingById = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const bookingResult = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [id],
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const guestsResult = await pool.query(
      `SELECT * FROM booking_guests WHERE booking_id = $1`,
      [id],
    );

    const cancellationsResult = await pool.query(
      `SELECT * FROM booking_cancellations WHERE booking_id = $1`,
      [id],
    );

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: {
        ...bookingResult.rows[0],
        guests: guestsResult.rows,
        cancellations: cancellationsResult.rows,
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

export const updateBooking = async (req, res) => {
  const { id } = req.params;
  const {
    branch_id,
    assign_to,
    check_in,
    check_out,
    adults,
    children,
    infants,
    pickup_location,
    drop_location,
    subtotal,
    discount,
    tax_amount,
    final_amount,
    booking_status,
    payment_status,
    internal_notes,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (booking_status && !BOOKING_STATUSES.includes(booking_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid booking_status. Allowed: ${BOOKING_STATUSES.join(", ")}`,
      });
    }

    if (payment_status && !PAYMENT_STATUSES.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment_status. Allowed: ${PAYMENT_STATUSES.join(", ")}`,
      });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET branch_id = COALESCE($1, branch_id),
           assign_to = COALESCE($2, assign_to),
           check_in = COALESCE($3, check_in),
           check_out = COALESCE($4, check_out),
           adults = COALESCE($5, adults),
           children = COALESCE($6, children),
           infants = COALESCE($7, infants),
           pickup_location = COALESCE($8, pickup_location),
           drop_location = COALESCE($9, drop_location),
           subtotal = COALESCE($10, subtotal),
           discount = COALESCE($11, discount),
           tax_amount = COALESCE($12, tax_amount),
           final_amount = COALESCE($13, final_amount),
           booking_status = COALESCE($14, booking_status),
           payment_status = COALESCE($15, payment_status),
           internal_notes = COALESCE($16, internal_notes),
           updated_at = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        branch_id ?? null,
        assign_to ?? null,
        check_in ?? null,
        check_out ?? null,
        adults ?? null,
        children ?? null,
        infants ?? null,
        pickup_location ?? null,
        drop_location ?? null,
        subtotal ?? null,
        discount ?? null,
        tax_amount ?? null,
        final_amount ?? null,
        booking_status ?? null,
        payment_status ?? null,
        internal_notes ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking updated successfully.",
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

export const deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM bookings WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};

export const addBookingGuest = async (req, res) => {
  const { id } = req.params;
  const {
    organization_id,
    full_name,
    age,
    gender,
    guest_type,
    phone,
    document_type,
    document_number_encrypted,
  } = req.body;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (!organization_id || !full_name) {
      return res.status(400).json({
        success: false,
        message: "organization_id and full_name are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    const gType = guest_type ?? "adult";
    if (!GUEST_TYPES.includes(gType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid guest_type. Allowed: ${GUEST_TYPES.join(", ")}`,
      });
    }

    if (gender && !GENDER_TYPES.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: `Invalid gender. Allowed: ${GENDER_TYPES.join(", ")}`,
      });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter valid 10-digit phone number starting with 6-9.",
      });
    }

    const result = await pool.query(
      `INSERT INTO booking_guests
       (organization_id, booking_id, full_name, age, gender, guest_type, phone, document_type, document_number_encrypted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        organization_id,
        id,
        full_name,
        age || null,
        gender || null,
        gType,
        phone || null,
        document_type || null,
        document_number_encrypted || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Booking guest added successfully.",
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

export const cancelBooking = async (req, res) => {
  const { id } = req.params;
  const {
    organization_id,
    cancelled_by,
    reason,
    cancellation_charge,
    refund_amount,
    status,
  } = req.body;

  const cancellerId = cancelled_by || req.user?.id;

  try {
    if (!UUID_REGEX.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    if (
      !organization_id ||
      !cancellerId ||
      cancellation_charge === undefined ||
      refund_amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "organization_id, cancelled_by, cancellation_charge, and refund_amount are required.",
      });
    }

    if (!UUID_REGEX.test(organization_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    if (!UUID_REGEX.test(cancellerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid cancelled_by user ID.",
      });
    }

    const cancelStatus = status ?? "requested";
    if (!CANCELLATION_STATUSES.includes(cancelStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid cancellation status. Allowed: ${CANCELLATION_STATUSES.join(", ")}`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const cancellationResult = await client.query(
        `INSERT INTO booking_cancellations
         (organization_id, booking_id, cancelled_by, reason, cancellation_charge, refund_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          organization_id,
          id,
          cancellerId,
          reason || null,
          cancellation_charge,
          refund_amount,
          cancelStatus,
        ],
      );

      await client.query(
        `UPDATE bookings SET booking_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      await client.query("COMMIT");

      return res.status(201).json({
        success: true,
        message: "Booking cancellation recorded successfully.",
        data: cancellationResult.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message || error,
    });
  }
};
