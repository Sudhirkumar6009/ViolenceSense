import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { config } from "./index";
import { getAtlasUserModel, IAtlasUser } from "./atlasAuth";
import logger from "../utils/logger";

// JWT Strategy for protected routes
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.auth.jwtSecret,
    },
    async (jwtPayload, done) => {
      try {
        const AtlasUser = await getAtlasUserModel();
        const user = await AtlasUser.findById(jwtPayload.id);
        if (user) {
          return done(null, user);
        }
        return done(null, false);
      } catch (error) {
        logger.error("JWT Strategy error:", error);
        return done(error, false);
      }
    },
  ),
);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.auth.google.clientId,
      clientSecret: config.auth.google.clientSecret,
      callbackURL: config.auth.google.callbackUrl,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const AtlasUser = await getAtlasUserModel();

        // Check if user already exists with this Google ID
        let user = await AtlasUser.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with the same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await AtlasUser.findOne({ email });
          if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.avatar = profile.photos?.[0]?.value || user.avatar;
            user.isVerified = true;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user
        const username =
          profile.displayName?.replace(/\s+/g, "_").toLowerCase() ||
          `user_${profile.id.substring(0, 8)}`;

        // Ensure unique username
        let finalUsername = username;
        let counter = 1;
        while (await AtlasUser.findOne({ username: finalUsername })) {
          finalUsername = `${username}_${counter}`;
          counter++;
        }

        const newUser = await AtlasUser.create({
          googleId: profile.id,
          username: finalUsername,
          email: email || `${profile.id}@google.user`,
          avatar: profile.photos?.[0]?.value,
          provider: "google",
          isVerified: true,
        });

        logger.info(`New Google user registered: ${email || finalUsername}`);
        return done(null, newUser);
      } catch (error) {
        logger.error("Google Strategy error:", error);
        return done(error as Error, undefined);
      }
    },
  ),
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const AtlasUser = await getAtlasUserModel();
    const user = await AtlasUser.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
