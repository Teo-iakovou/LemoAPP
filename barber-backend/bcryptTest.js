const bcrypt = require("bcrypt");

const hashPassword = async () => {
  const plaintextPassword = "YourPassword"; // Replace with your intended password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plaintextPassword, salt);
  console.log("New hashed password:", hashedPassword);
};

hashPassword();
