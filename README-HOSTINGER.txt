========================================================================
 Tech Mentor ERP & POS — Hostinger Node.js Deployment (via GitHub)
========================================================================

This folder is a PREBUILT, ready-to-run package. Nothing needs to be
compiled on Hostinger — it just installs 2 small dependencies and starts.

It runs ALL FOUR modules from ONE Node.js app:
  /               -> ERP Admin Panel        (smart-retail-erp)
  /store          -> E-Commerce Store        (store)
  /customer-app   -> Customer Portal         (customer-app)
  /api            -> API Server (Express)
  /api/healthz    -> health check (returns 200)

Login: admin / admin123

KNOWN LIMITATION (read this):
  Uploading product IMAGES does not work on Hostinger yet. Image uploads
  need a separate file-storage service (e.g. Amazon S3). Everything else
  works. On Hostinger, trying to upload an image shows a clear message
  instead of breaking the page. Ask to have external storage added when
  you want image uploads to work live.

------------------------------------------------------------------------
 1. PROJECT STRUCTURE (already correct — do not rearrange)
------------------------------------------------------------------------
  index.js                              <- start file (entry)
  package.json                          <- dependencies + start script
  package-lock.json                     <- locked dependency versions
  database-setup.sql                    <- already run in Neon (one time)
  artifacts/api-server/dist/*.mjs       <- the bundled server
  artifacts/smart-retail-erp/dist/public <- ERP built files
  artifacts/store/dist/public           <- Store built files
  artifacts/customer-app/dist/public    <- Customer Portal built files

IMPORTANT: index.js and package.json must sit at the ROOT of the GitHub
repository (not inside a sub-folder).

------------------------------------------------------------------------
 2. PUT THIS ON GITHUB (GitHub Desktop)
------------------------------------------------------------------------
  1. Extract this folder's contents into a new empty folder on your PC,
     e.g.  techmentor-hostinger
     (index.js and package.json must be directly inside it.)
  2. GitHub Desktop -> File -> Add local repository -> pick that folder
     -> "create a repository" -> Create repository.
  3. Enter a summary ("initial") -> Commit to main.
  4. Publish repository (Private is fine).

------------------------------------------------------------------------
 3. ENVIRONMENT VARIABLES (set these on Hostinger)
------------------------------------------------------------------------
  DATABASE_URL   = your Neon connection string (ends with ?sslmode=require)
  SESSION_SECRET = any long random text (30+ characters)

  (NODE_ENV and PORT are handled automatically — do not set them.)

------------------------------------------------------------------------
 4. BUILD COMMAND
------------------------------------------------------------------------
  (leave blank — this package is already built)
  If a value is required, use:   npm install

------------------------------------------------------------------------
 5. START COMMAND
------------------------------------------------------------------------
  npm start
  (this runs: node index.js)

  Entry file (if asked): index.js
  Output directory (if asked): leave blank

------------------------------------------------------------------------
 6. NEON DATABASE
------------------------------------------------------------------------
  - Tables were already created by running database-setup.sql in the Neon
    SQL Editor (one-time step — already done).
  - The app connects using the DATABASE_URL env var above.
  - SSL is enabled automatically because the URL ends with ?sslmode=require.

------------------------------------------------------------------------
 7. DEPLOY ON HOSTINGER (GitHub method)
------------------------------------------------------------------------
  1. hPanel -> Websites -> Add Website -> Node.js Web App.
  2. Choose "Import Git Repository" -> Authorize GitHub -> select your
     repo (techmentor-hostinger).
  3. Build settings:
        Framework        = Other
        Entry file       = index.js
        Output directory = (blank)
        Build command    = (blank)
        Node.js version  = 18 or higher
  4. Add the two Environment Variables from section 3.
  5. Click Deploy.
  6. When finished, open the site and log in with admin / admin123.
     Check /, /store, and /customer-app all load.

========================================================================
