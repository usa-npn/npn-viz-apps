# Retrofitting Site Level and Magnitude Data

This is a relatively straightforward requirements document describing a retrofit to this product, moving away from older API endpoints. We are going to rework this project step-wise, and this is the second step, following the work done described in summarized-data.md.

The endpoints in question to replace live in 

Magnitude Data: activity-curve.ts

Site Level Data: Site Level Data already has a mock function that just needs to be filled in / completed, located in observation.service.ts.


We want to touch as few lines of code as possible. There are greater opportunities to refactor this code later, but for now, we focus purely on getting this endpoint call working.

The new endpoint for these calls are: 

Site Level Data: https://services2-dev.usanpn.org/v1/data/site_phenometrics

Magntidue: https://services2-dev.usanpn.org/v1/data/magnitude_phenometrics

We should assume that the payload from the endpoint should be comparable to that what we get today, but we may need to iterate on errors, rather than try to plan it perfectly from the first move. 

In a production environment the URL would be services.usanpn.org or something similar, but that needs to be exchangable via env files as it is today. 

We do however want to make sure that the new endpoint changes are centralized in network.service.ts as it is today, and configurable through a configuration file. Also as per the previously completed work, we want to move APIs calls and data handling into dedicated data layer, leveraging the groundwork done in the previous iterations, e.g. observation.service.ts.

