if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}


// const express = require('express');
// const router = express.Router();
// const Swap = require('../models/swap');
const express = require("express");
const app = express()
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const multer = require("multer");
const { storage } = require("./cloudConfig.js");
const upload = multer({ storage });
const MongoStore = require('connect-mongo');
const UserPoints = require("./models/userPoints.js");
const Item = require("./models/item.js");
const Swap = require("./models/swap.js");
const { isLoggedIn, isAdmin, isUser, validateReview, isAuthor } = require("./utils/middleware.js");
const helmet = require("helmet");
const compression = require("compression");

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://img.icons8.com"],
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "connect-src": ["'self'", "https://api.maptiler.com"],
        "object-src": ["'none'"]
      },
    },
  })
);

app.use(compression()); // to gzip responses


const { cloudinary } = require("./cloudConfig.js");


const dbUrl  = process.env.ATLASDB_URL;
// const dbUrl = "mongodb://127.0.0.1:27017/ReWear";
// const methodOverride = require('method-override');
app.use(methodOverride('_method'));


main()
    .then(() => {
        console.log("connected to db")
    })
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.engine("ejs", ejsMate);

app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", () => {
    console.log("ERROR IN SESSION STORE", err)
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,

    },
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


// ------------------------------------------   Functions   ----------------------------------------------------------

// function isAdmin(req, res, next) {
//     if (req.isAuthenticated() && req.user.role === 'admin') {
//         return next();
//     }
//     req.flash("error", "You do not have permission to access this page.");
//     res.redirect("/listings");
// }

// -----------------------------------------------  Listing  ----------------------------------------------------------------

// root route

app.get("/", async (req, res) => {
    const { query } = req.query;

    let allListings;
    if (query) {
        let searchRegex = new RegExp(query, 'i');
        allListings = await Listing.find({
            $or: [
                { title: searchRegex },
                { location: searchRegex },
                { country: searchRegex }
            ]
        });
    } else { allListings = await Listing.find({})
  .populate('owner', 'username points');
    }

    res.render("./listings/index.ejs", { allListings });
});


// index route 
// Combined and final version of GET /listings
app.get("/listings", async (req, res) => {
  try {
    const { query } = req.query;
    let searchFilter = {};

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      searchFilter = {
        $or: [
          { title: searchRegex },
          { location: searchRegex },
          { country: searchRegex }
        ]
      };
    }

    const allListings = await Listing.find(searchFilter).populate("owner");

    // Get all unique owner IDs
    const ownerIds = allListings.map(listing => listing.owner?._id).filter(Boolean);

    const swaps = await Swap.find({
      $or: [
        { senderId: { $in: ownerIds } },
        { receiverId: { $in: ownerIds } }
      ]
    });

    // Compute points per user
    const pointsMap = {};
    swaps.forEach(swap => {
      [swap.senderId, swap.receiverId].forEach(userId => {
        const id = userId.toString();
        if (!pointsMap[id]) pointsMap[id] = 1000;
        if (swap.status === "approved") pointsMap[id] += 200;
        else if (swap.status === "rejected") pointsMap[id] += 100;
        // pending = 0
      });
    });

    // Attach computed points to listing.owner
    allListings.forEach(listing => {
      const owner = listing.owner;
      if (owner) {
        const id = owner._id.toString();
        owner.points = pointsMap[id] || 1000; // Default base
      }
    });

    res.render("listings/index", { allListings });
  } catch (err) {
    console.error("Error loading listings:", err);
    res.status(500).send("Server error");
  }
});



// new route

app.get("/listings/new", (async (req, res) => {
    res.render("./listings/new.ejs")
}));


// show route 

app.get("/listings/:id", async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" }
        })
        .populate("owner");  // ✅ Ensure owner is populated

    if (!listing) {
        req.flash("error", "Listing that you requested doesn't exist.");
        return res.redirect("/listings");
    }

    const address = listing.location;
    const apiKey = 'M71NvRBSUXVdkBcX50XE';
    const geourl = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${apiKey}`;

    let coordinates;
    try {
        const response = await fetch(geourl);
        const data = await response.json();

        if (data && data.features && data.features.length > 0) {
            coordinates = data.features[0].geometry.coordinates;
        } else {
            coordinates = [0, 0];
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        coordinates = [0, 0];
    }

    res.render("./listings/show.ejs", { listing, coordinates });
});


// // create route 

// app.post("/listings", isLoggedIn , upload.single('listing[image]') , validateListing  , wrapAsync(async (req, res, next) => {
//     let url = req.file.path;
//     let  filename = req.file.filename;

//     // let listing = req.body.listing;
//     // let newlisting = new Listing(listing);

//     const newListing = new Listing(req.body.listing);
//     newListing.owner = req.user._id;
//     newListing.image = {url,filename};
//     await newListing.save();
//     req.flash("success", "New listing created!");
//     res.redirect("/listings");

// })
// );

app.post("/listings", upload.array("listing[images]"), async (req, res, next) => {
    try {
        const { listing } = req.body;

        // Process tags from comma-separated string to array
        if (typeof listing.tags === 'string') {
            listing.tags = listing.tags.split(',').map(tag => tag.trim());
        }

        // Store image data as array of objects
        if (req.files && req.files.length > 0) {
            listing.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
        }

        const newListing = new Listing(listing);

        // Optional: assign current user if using auth
        newListing.owner = req.user._id;

        await newListing.save();
        req.flash("success", "New listing created!");
        res.redirect("/listings");
    } catch (err) {
        console.error("Error creating listing:", err);
        req.flash("error", "Failed to create listing.");
        res.redirect("/listings/new");
    }
});



// edit route 
// EDIT routes with dynamic edit form options
app.get("/listings/:id/edit", isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested does not exist");
    return res.redirect("/listings");
  }
  // Predefined option sets
  const categories = ["tops","tshirts","jeans","dresses","jackets","ethnic-wear","sweaters","skirts","kids","winter","summer"];
  const types = ["casual","formal","sportswear","outerwear","footwear"];
  const sizes = ["XS","S","M","L","XL","XXL"];
  const conditions = ["new","like new","good","fair","poor"];

  res.render("listings/edit.ejs", {
    listing,
    categories,
    types,
    sizes,
    conditions
  });
});

app.put("/listings/:id", isLoggedIn, upload.single("listing[image]"), async (req, res) => {
  const { id } = req.params;
  const data = req.body.listing;
  data.tags = typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()) : data.tags;

  const listing = await Listing.findByIdAndUpdate(id, data, { new: true });

  if (req.file) {
    listing.images = [{ url: req.file.path, filename: req.file.filename }];
  }

  await listing.save();
  req.flash("success", "Listing updated!");
  res.redirect(`/listings/${id}`);
});

app.delete("/listings/:id", isLoggedIn, async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted!");
  res.redirect("/listings");
});
// POST /listings/:id/reviews — Add a review to a listing
app.post(
  "/listings/:id/reviews",
  isLoggedIn,
  validateReview,
  wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      req.flash("error", "Listing not found.");
      return res.redirect("/listings");
    }

    const review = new Review(req.body.review);
    review.author = req.user._id;
    await review.save();

    listing.reviews.push(review);
    await listing.save();

    req.flash("success", "Review added!");
    res.redirect(`/listings/${listing._id}`);
  })
);

app.delete(
  "/listings/:id/reviews/:reviewId",
  isLoggedIn,
  isAuthor,
  wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;

    // Remove review ID from the listing's `reviews` array
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });

    // Delete the actual review document
    await Review.findByIdAndDelete(reviewId);

    req.flash("success", "Review deleted.");
    res.redirect(`/listings/${id}`);
  })
);


// --------------------------------------------------------------- Divy Functionality -------------------------------------------

// API: Get user profile and points
app.get('/user/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserPoints.findById(userId).select('name email points');
        if (!user) return res.status(404).send("User not found");
        res.render('users/profile.ejs', { user });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).send("Server error");
    }
});

// API: Get user items
app.get('/user/:id/items', async (req, res) => {
    try {
        const userId = req.params.id;
        const items = await Item.find({ userId });
       res.render('users/userItems.ejs', { items, user: req.user });

    } catch (err) {
        console.error("Error fetching user items:", err);
        res.status(500).send("Server error");
    }
});


// API: Get user swaps
// GET swap form (before rendering the form)
// GET /user/:id/swaps
app.get('/user/:id/swaps', async (req, res) => {
  try {
    const { id: userId } = req.params;

    // Get all items created by this user
    const userItems = await Listing.find({ owner: userId });

    // Get all items in the system
    const allItems = await Listing.find({});

    // 🟡 FIX: Get all users WITH their role field
  const allUsers = await User.find({ role: 'user' }, 'username role');


    // Get all swaps where the user is sender or receiver
    const swaps = await Swap.find({ 
        $or: [{ senderId: userId }, { receiverId: userId }]
    })
    .populate('senderId', 'username role')
    .populate('receiverId', 'username role')
    .populate('senderItemId', 'title')
    .populate('receiverItemId', 'title');

    // Render the swap view
    res.render('users/userSwaps.ejs', {
        swaps,
        user: req.user,
        allUsers,     // all users with role info
        allItems,     // for receiver item dropdown
        userItems     // for sender item dropdown
    });

  } catch (error) {
    console.error('Error loading swaps:', error);
    res.status(500).send('Server Error');
  }
});





// API: Upload new item

app.post('/user/:id/items', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, size, condition, imageUrl } = req.body;
        const newItem = new Item({
            userId: id,
            title,
            description,
            size,
            condition,
            imageUrl
        });
        await newItem.save();
        req.flash("success", "Item added!");
        res.redirect(`/user/${id}/items`);
    } catch (err) {
        console.error("Error adding item:", err);
        res.status(500).send("Server error");
    }
});

// API: Update item
app.put('/user/:userId/items/:itemId', async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const updateData = req.body;

        const item = await Item.findOneAndUpdate(
            { _id: itemId, userId: userId }, // ensure the item belongs to the user
            updateData,
            { new: true }
        );

        if (!item) {
            req.flash("error", "Item not found or unauthorized");
            return res.redirect(`/user/${userId}/items`);
        }

        req.flash("success", "Item updated successfully!");
        res.redirect(`/user/${userId}/items`);
    } catch (err) {
        console.error("Error updating item:", err);
        req.flash("error", "Server error while updating item");
        res.redirect(`/user/${req.params.userId}/items`);
    }
});
app.post('/user/:id/swaps', async (req, res) => {
    try {
        const { id } = req.params;
        const { receiverId, senderItemId, receiverItemId, status } = req.body;

        const newSwap = new Swap({
            senderId: id,
            receiverId,
            senderItemId,
            receiverItemId,
            status: status || "pending"
        });

        await newSwap.save();
        req.flash("success", "Swap created!");
        res.redirect(`/user/${id}/swaps`);
    } catch (err) {
        console.error("Error creating swap:", err);
        res.status(500).send("Server error");
    }
});


app.get("/upload", (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to upload items.");
        return res.redirect("/login");
    }

    res.render("users/upload.ejs"); // Create this EJS file
});


// --------------------------------------------------   User   ----------------------------------------------------------------------------------------------------------

app.get("/signup", (req, res) => {
    res.render("users/signup.ejs")
});


app.post("/signup", async (req, res) => {
    try {
        let { username, email, password, role } = req.body; // Extract role here
        const newUser = new User({ email, username, role }); // Save it to schema
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to ArcadiaLuxe");
            res.redirect("/listings");
        });

    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
});


app.get("/login", (req, res) => {
    res.render("users/login.ejs")
});

app.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
}), async (req, res) => {
    const selectedRole = req.body.role;
    const user = req.user;

    // Ensure the role selected in form matches the one in DB
    if (user.role !== selectedRole) {
        req.logout(() => {
            req.flash("error", `Incorrect role selected. You're registered as ${user.role}.`);
            res.redirect("/login");
        });
        return;
    }

    req.flash("success", `Welcome back, ${user.username}!`);

    // Redirect based on role
    if (user.role === "admin") {
        res.redirect("/admin/dashboard");
    } else {
        res.redirect("/user/dashboard");
    }
});



app.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Logged out successfully");
        res.redirect("/listings");
    });
});
app.get("/user/dashboard", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "user") {
    req.flash("error", "Unauthorized access");
    return res.redirect("/login");
  }

  try {
    const userItems = await Listing.find({ owner: req.user._id });

    const allSwaps = await Swap.find({
      $or: [
        { senderId: req.user._id },
        { receiverId: req.user._id }
      ]
    }).populate("senderItemId receiverItemId senderId receiverId");

    const completedSwaps = allSwaps.filter(
      (swap) => swap.status === "approved" || swap.status === "rejected"
    );

    const pendingSwaps = allSwaps.filter(
      (swap) => swap.status === "pending"
    );

    // 🧮 Calculate points:
    let points = 1000;
    allSwaps.forEach(swap => {
      if (swap.status === "approved") points += 200;
      else if (swap.status === "rejected") points += 100;
      // pending = 0
    });

    // Override points in user object just for rendering
    const userWithPoints = {
      ...req.user.toObject(), // in case it's a Mongoose doc
      points
    };

    res.render("users/userDashboard.ejs", {
      user: userWithPoints,
      currUser: req.user,
      userItems,
      completedSwaps,
      pendingSwaps
    });
  } catch (err) {
    console.error("User dashboard error:", err);
    req.flash("error", "Failed to load dashboard.");
    res.redirect("/listings");
  }
});

app.get("/admin/dashboard", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
        req.flash("error", "Unauthorized access");
        return res.redirect("/login");
    }

    try {
        const swaps = await Swap.find({})
            .populate("senderId", "username")
            .populate("receiverId", "username")
            .populate("senderItemId", "title")
            .populate("receiverItemId", "title");

       const adminUser = req.user; // assuming middleware sets req.user

    res.render("users/adminDashboard", {
      swaps,
      user: adminUser,
      currUser: adminUser
    });
  } catch (err) {
    console.error("Admin dashboard error:", err);
    res.status(500).send("Error loading admin dashboard");
  }
});

app.post("/admin/swaps/:id/approve", async (req, res) => {
    const swapId = req.params.id;
    await Swap.findByIdAndUpdate(swapId, { status: "approved" });
    res.redirect("/admin/dashboard");
});

app.post("/admin/swaps/:id/reject", async (req, res) => {
    const swapId = req.params.id;
    await Swap.findByIdAndUpdate(swapId, { status: "rejected" });
    res.redirect("/admin/dashboard");
});

// -----------------------------------------------    MW    -----------------------------------------------------------------------------------------

// app.all("*", (req, res, next) => {
//     next(new ExpressError(404, "page not found!"));
// })


app.use((err, req, res, next) => {
    let { statusCode = 500, message = "something went wrong!" } = err;
    res.status(statusCode).render("./listings/error.ejs", { err });
});



app.listen(8080, (req, res) => {
    console.log('Server started on http://localhost:8080/listings')
})






