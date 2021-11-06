const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const { validateRegisterInput, validateLoginInput } = require("../../util/validators");
const { SECRET_KEY } = require("../../config");
const User = require("../../models/User");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: "24h" }
  );
}

module.exports = {
  Mutation: {
    async login(_, { username, password }) {
      const { valid, errors } = validateLoginInput(username, password);
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }

      const user = await User.findOne({ username });

      if (!user) {
        errors.general = "Username not found!";
        throw new UserInputError("This username doesn/'t exist!");
      }

      const matchPwd = await bcrypt.compare(password, user.password);
      if (!matchPwd) {
        errors.password = "Wrong Password!";
        throw new UserInputError("The password you entered is not correct!", {
          errors: {
            password: "This password you enteres is not correct",
          },
        });
      }
      const token = generateToken(user);

      return {
        ...user._doc,
        id: user._id,
        token,
      };
    },
    async register(_, { registerInput: { username, email, password, confirmPassword } }) {
      // TODO Validate user data
      const { valid, errors } = validateRegisterInput(username, email, password, confirmPassword);
      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }
      // TODO user doesn't exist
      const user = await User.findOne({ username });

      if (user) {
        throw new UserInputError("Username is not available", {
          errors: {
            username: "This username is not available",
          },
        });
      }

      const userEmail = await User.findOne({ email });

      if (userEmail) {
        throw new UserInputError("Email already registered", {
          errors: {
            username: "There is already an account registered with this email",
          },
        });
      }

      // Hash the password and create token
      password = await bcrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();

      const token = generateToken(res);

      return {
        ...res._doc,
        id: res._id,
        token,
      };
    },
  },
};
