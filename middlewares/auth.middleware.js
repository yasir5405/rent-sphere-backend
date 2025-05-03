const bcrypt = require("bcrypt");

const hashPassword = async (req, res, next) => {
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);
  req.body.password = hashedPassword;
  next();
};

module.exports = {
  hashPassword,
};
