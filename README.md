# ReWear

ReWear is a web-based platform that empowers users to exchange unused clothing through direct swaps or a point-based redemption system. Our goal is to promote sustainable fashion and reduce textile waste by encouraging users to reuse wearable garments instead of discarding them.

### Live Demo

Check out the live application here: [https://rewear-4tga.onrender.com](https://rewear-4tga.onrender.com)

-----

## Team

This project was developed by the following contributors:

  * **Parekh Divy Vinodkumar**
      * Email: divyparekh942622@gmail.com
  * **Patel Hard Harshadbhai**
      * Email: harsadp391@gmail.com
  * **Patel Prayesh Vijaykumar**
      * Email: prayeshpatel079@gmail.com
  * **Patel Jeel Vishnubhai**
      * Email: jeelp94095@gmail.com

-----

## Code Style Guide

Welcome to the ReWear project\! To ensure our codebase remains clean, consistent, and easy to maintain, we follow a set of coding style guidelines. Adhering to these standards is mandatory for all contributions.

### Why a Style Guide?

  * **Consistency:** Makes the entire codebase look and feel like it was written by a single person.
  * **Readability:** Reduces cognitive load for developers, allowing them to focus on logic rather than style.
  * **Maintainability:** Makes it easier to find, fix, and update code when it follows a predictable pattern.

-----

### 1\. General Guidelines

  * **Indentation:** Use **2 spaces** for indentation. Never use tabs.
  * **Line Endings:** Use Unix-style line endings (`LF`).
  * **File Naming:** Use `kebab-case` for file names (e.g., `user-controller.js`, `cloth-listing.html`).
  * **Max Line Length:** Keep lines under 100 characters to improve readability on most screens.
  * **Automated Formatting:** We recommend using tools like **ESLint** and **Prettier** to automatically enforce these rules.

-----

### 2\. JavaScript & Node.js Style

We primarily follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript), with a few minor modifications.

  * **Variable Declarations:** Use `const` by default. Only use `let` when a variable needs to be reassigned. Avoid using `var`.
  * **Semicolons:** **Always** use semicolons at the end of statements.
  * **Quotes:** Use **single quotes** (`'...'`) for strings, unless the string contains a single quote.
  * **Naming Conventions:**
      * `camelCase` for variables, functions, and object properties (e.g., `const clothImageUrl = '...'`).
      * `PascalCase` for class names and constructor functions (e.g., `class UserController { ... }`).
      * `UPPER_SNAKE_CASE` for constants that are never modified (e.g., `const JWT_SECRET = '...'`).
  * **Arrow Functions:** Prefer arrow functions (`=>`) over traditional function expressions, especially for anonymous functions.

#### Example:

```javascript
// Good
const MAX_FILE_SIZE = 1024 * 1024;

const validateUser = (user) => {
  if (!user.email) {
    throw new Error('Email is required.');
  }
};
```

```javascript
// Bad
var email = 'test@example.com';
function validateUser(user) {
  if (!user.email) {
    throw new Error('Email is required.');
  }
}
```

-----

### 3\. HTML & Templating Engine Style (EJS)

  * **Indentation:** Use 2 spaces for indentation.
  * **Tag Naming:** Always use lowercase for HTML tags.
  * **Quotes:** Use double quotes (`"..."`) for all attribute values.
  * **Class Naming:** Use `kebab-case` for class names (e.g., `<div class="cloth-listing-card">`).
  * **Self-Closing Tags:** All self-closing tags (e.g., `<img>`, `<input>`) must be closed with a trailing slash (`<img src="..." />`).

-----

### 4\. CSS Style

  * **Indentation:** Use 2 spaces.
  * **Selectors:** Use `kebab-case` for class and ID selectors. Avoid overly complex or deeply nested selectors.
  * **Braces:** Use braces on the same line as the selector.
  * **Property Order:** Group related properties together (e.g., positioning, box model, typography, color).
  * **Color Values:** Use hex codes (`#3498db`) over named colors (`blue`).
  * **Comments:** Use comments to explain complex sections or components.

#### Example:

```css
/* Good */
.main-navigation {
  margin: 0;
  padding: 10px;
  background-color: #333;
}

.main-navigation__item {
  color: #fff;
  font-size: 1.2rem;
}
```

```css
/* Bad */
.mainNavigation {
  background-color: #333;
  padding: 10px;
  margin: 0;
}
```

-----

### 5\. Git Commit Style

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for clear and automated commit message generation.

**Format:** `<type>: <description>`

**type:** Must be one of the following:

  * `feat`: A new feature
  * `fix`: A bug fix
  * `docs`: Documentation changes
  * `style`: Code formatting changes (whitespace, semicolons, etc.)
  * `refactor`: A code change that neither fixes a bug nor adds a feature
  * `test`: Adding missing tests or correcting existing tests
  * `chore`: Changes to the build process or auxiliary tools

**description:** A brief, clear description of the change, starting with a lowercase letter and using imperative mood ("Add" instead of "Added").

#### Example:

```bash
# Good
git commit -m "feat: add user profile page"
git commit -m "fix: resolve issue with duplicate listings"

# Bad
git commit -m "made some changes"
```

-----

### 6\. Contribution & Code Review

When you submit a pull request, ensure your code adheres to all the guidelines above. We use code reviews to check for style adherence and overall code quality. Pull requests that do not follow the style guide may be sent back for revision.

Thank you for helping us maintain a high-quality codebase\!
