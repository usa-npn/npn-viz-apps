# Npn Vis Apps

This project contains three applications and the core library of shared functionality.

- `projects/npn/common` is the `@npn/common` shared library.
- `projects/vis-tool` is the core visualization tool.
- `projects/fws-dashboard` is the FWS dashboard application.
- `projects fws-spring` is the FWS status of spring application.

## Development server

To run the development server on your local machine run `npm start` and once compiled navigate to `http://localhost:4200/`.

This is strictly for the visualization tool.  The two `fws-*` projects require a running Drupal system to serve them up and so must be compiled or "watched" into the appropriate locations on that Drupal site.

## Building

All compiled applications will be compiled into a corresponding sub-directory of the `dist` directory.

### The Vis Tool

`npm run builddev` for a dev build

`npm run buildprod` for a production build

### FWS Dashboard

`npm run build-fws-dashboard`

Or a development watch (the extra `--` in the middle of the command is important):

`npm run build-fws-dashboard -- --output-path <path to drupal>/modules/custom/fws_dashboard/app --watch`

(or remove `--watch` to compile production copy directly into the Drupal instance.)

### FWS Spring

`npm run build-fws-spring`

Or a development watch (the extra `--` in the middle of the command is important):

`npm run build-fws-spring -- --output-path <path to drupal>/modules/custom/fws_dashboard/spring --watch`

(or remove `--watch` to compile production copy directly into the Drupal instance.)

## Notes

Typically a development build vs. a production build will communicate with different services (dev vs. production).  These kinds of configuration differences are compiled into the application via the environment files.

For example:
- `projects/vis-tool/src/environments/environment.ts` is the configuration of a development build.
- `projects/vis-tool/src/environments/environment.prod.ts` is the configuration of a production build.