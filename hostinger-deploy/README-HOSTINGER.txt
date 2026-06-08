========================================================================
 Tech Mentor ERP & POS — Hostinger Node.js Deployment (via GitHub)
========================================================================

This folder is a PREBUILT, ready-to-run package. Nothing needs to be
compiled on Hostinger — it just installs a few small dependencies and
starts.

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
  artifacts/api-server/dist/*.mjs       <- the bundled server
  artifacts/smart-retail-erp/dist/public <- ERP built files
  artifacts/store/dist/public           <- Store built files
  artifacts/customer-app/dist/public    <- Customer Portal built files

IMPORTANT: index.js and package.json must sit at the ROOT of the GitHub
repository (not inside a sub-folder).

------------------------------------------------------------------------
 2. DATABASE (MySQL — already set up)
------------------------------------------------------------------------
  - This app uses MySQL (e.g. Hostinger MySQL).
  - The 32 tables were already created by importing database/schema.sql
    into the database via phpMyAdmin (one-time step — already done).
  - The app connects using the DATABASE_URL env var below.

------------------------------------------------------------------------
 3. ENVIRONMENT VARIABLES (set these on Hostinger)
------------------------------------------------------------------------
  DATABASE_URL   = mysql://DBUSER:DBPASS@127.0.0.1:3306/DBNAME
                   (use 127.0.0.1 when the app and database are on the
                    same Hostinger account; if you must connect to a
                    remote MySQL host over the internet, use that host
                    name and also add DATABASE_SSL = true)
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
 6. DEPLOY ON HOSTINGER (GitHub method)
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
