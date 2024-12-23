// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');
const methodOverride = require('method-override');
const app = express();

// Middleware setup
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: true
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/blogDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define user schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Define the blog schema and model
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Blog = mongoose.model('Blog', blogSchema);

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Routes

// Login Routes
app.get('/login', (req, res) => {
  res.render('login', { user: req.session.user || null });
});

app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username, password: req.body.password });
    if (user) {
      req.session.user = user;
      res.redirect('/');
    } else {
      res.send('Invalid username or password');
    }
  } catch (err) {
    res.status(500).send('Error during login');
  }
});

// Register Routes
app.get('/register', (req, res) => {
  res.render('register', { user: req.session.user || null });
});

app.post('/register', async (req, res) => {
  try {
    const newUser = new User({
      username: req.body.username,
      password: req.body.password,
    });
    await newUser.save();
    res.redirect('/login');
  } catch (err) {
    res.status(500).send('Error during registration');
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Home Route - List all blogs
app.get('/', isLoggedIn, async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.render('index', { blogs, user: req.session.user || null });
  } catch (err) {
    res.status(500).send('Error fetching blogs');
  }
});

// New Blog Form Route
app.get('/blogs/new', isLoggedIn, (req, res) => {
  res.render('new', { user: req.session.user || null });
});

// Create New Blog Route
app.post('/blogs', isLoggedIn, async (req, res) => {
  try {
    const newBlog = new Blog({
      title: req.body.title,
      content: req.body.content,
      author: req.session.user.username,
    });
    await newBlog.save();
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Error creating blog');
  }
});

// Show Single Blog Route
app.get('/blogs/:id', isLoggedIn, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    res.render('show', { blog, user: req.session.user || null });
  } catch (err) {
    res.status(404).send('Blog not found');
  }
});

// Edit Blog Form Route
app.get('/blogs/:id/edit', isLoggedIn, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog.author === req.session.user.username) {
      res.render('edit', { blog, user: req.session.user || null });
    } else {
      res.status(403).send('Unauthorized');
    }
  } catch (err) {
    res.status(404).send('Blog not found');
  }
});

// Update Blog Route
app.put('/blogs/:id', isLoggedIn, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog.author === req.session.user.username) {
      await Blog.findByIdAndUpdate(req.params.id, {
        title: req.body.title,
        content: req.body.content,
      });
      res.redirect(`/blogs/${req.params.id}`);
    } else {
      res.status(403).send('Unauthorized');
    }
  } catch (err) {
    res.status(500).send('Error updating blog');
  }
});

// Delete Blog Route
app.delete('/blogs/:id', isLoggedIn, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (blog.author === req.session.user.username) {
      await Blog.findByIdAndDelete(req.params.id);
      res.redirect('/');
    } else {
      res.status(403).send('Unauthorized');
    }
  } catch (err) {
    res.status(500).send('Error deleting blog');
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
