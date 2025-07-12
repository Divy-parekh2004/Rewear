if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}
const express = require("express");
const app = express()
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
// const wrapAsync = require("./utils/wrapAsync.js");
// const ExpressError = require("./utils/ExpressError.js");
// const { listingSchema, reviewSchema } = require("./schema.js");
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



// const dbUrl  = process.env.ATLASDB_URL;
const dbUrl = "mongodb://127.0.0.1:27017/ReWear";


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

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    req.flash("error", "You do not have permission to access this page.");
    res.redirect("/listings");
}









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
    } else {
        allListings = await Listing.find({});
    }

    res.render("./listings/index.ejs", { allListings });
});


// index route 
app.get("/listings", (async (req, res) => {
    const { query } = req.query;
    let searchRegex = new RegExp(query, 'i');

    const allListings = await Listing.find({
        $or: [
            { title: searchRegex },
            { location: searchRegex },
            { country: searchRegex }
        ]
    });

    res.render("./listings/index.ejs", { allListings });
}));



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
        // newListing.owner = req.user._id;

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

app.get("/listings/:id/edit", (async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested does not exist");
        res.redirect("/listings")
    }
    // let originalImageUrl = listing.image.url;
    // originalImageUrl = originalImageUrl.replace("/upload","/upload/w_250");
    res.render("./listings/edit.ejs", { listing });

}))


app.put("/listings/:id", upload.single("listing[image]"), (async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body.listing;

    // Find the listing and update its non-image fields
    const listing = await Listing.findByIdAndUpdate(id, updatedData, { new: true });

    // Only update the image if a new file is uploaded
    if (req.file) {
        listing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }

    await listing.save();
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
}));



// delete route 

app.delete("/listings/:id", (async (req, res) => {
    const { id } = req.params;
    let deletedList = await Listing.findByIdAndDelete(id);
    console.log(deletedList);
    req.flash("success", "Listing deleted!");
    res.redirect("/listings");

}))


// --------------------------------------------------------------- Divy Functionality -------------------------------------------

// API: Get user profile and points
app.get('/api/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserPoints.findById(userId).select('name email points');
        if (!user) return res.status(404).send("User not found");
        res.json(user);
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).send("Server error");
    }
});

// API: Get user items
app.get('/api/user/:id/items', async (req, res) => {
    try {
        const userId = req.params.id;
        const items = await Item.find({ userId });
        res.json(items);
    } catch (err) {
        console.error("Error fetching user items:", err);
        res.status(500).send("Server error");
    }
});

// API: Get user swaps
app.get('/api/user/:id/swaps', async (req, res) => {
    try {
        const userId = req.params.id;
        const swaps = await Swap.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        });
        res.json(swaps);
    } catch (err) {
        console.error("Error fetching user swaps:", err);
        res.status(500).send("Server error");
    }
});

// API: Upload new item
app.post('/api/items', async (req, res) => {
    try {
        const { userId, title, description, size, condition, imageUrl } = req.body;
        const newItem = new Item({
            userId,
            title,
            description,
            size,
            condition,
            imageUrl
        });
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        console.error("Error uploading item:", err);
        res.status(500).send("Server error");
    }
});

// API: Update item
app.put('/api/items/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const updateData = req.body;
        const updatedItem = await Item.findByIdAndUpdate(itemId, updateData, { new: true });
        if (!updatedItem) return res.status(404).send("Item not found");
        res.json(updatedItem);
    } catch (err) {
        console.error("Error updating item:", err);
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

app.get("/user/dashboard", (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "user") {
        req.flash("error", "Unauthorized access");
        return res.redirect("/login");
    }
    res.render("users/userDashboard.ejs", { user: req.user });
});

app.get("/admin/dashboard", (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
        req.flash("error", "Unauthorized access");
        return res.redirect("/login");
    }
    res.render("users/adminDashboard.ejs", { user: req.user });
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






