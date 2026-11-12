import jwt from "jsonwebtoken";

export const admin_login = async (req, res) => {
  const { user_name, email, password } = req.body;
  try {
    if (!user_name && !email) {
      return res.status(400).json({
        success: false,
        message: "User name Or email is Invalid.",
      });
    }
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Invalid password.",
      });
    }
    if (user_name) {
      if (user_name !== process.env.ADMIN_USER_NAME) {
        return res.status(400).json({
          success: false,
          message: "User name is Invalid.",
        });
      }
    }
    if (email) {
      if (email !== process.env.ADMIN_USER_EMAIL) {
        return res.status(400).json({
          success: false,
          message: "Email is Invalid.",
        });
      }
    }
    if (password !== process.env.ADMIN_USER_PASSWORD) {
      return res.status(400).json({
        success: false,
        message: "Password is Invalid.",
      });
    }
    const adminData = user_name || email;
    const token = jwt.sign(
      {
        admin_data: adminData,
        type: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    return res.status(200).json({
      success: true,
      message: "Admin authenticated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const admin_logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    return res.status(200).json({
      success: true,
      message: "Admin logged out successfully.",
    });
  } catch (error) {
    console.error("Admin logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
