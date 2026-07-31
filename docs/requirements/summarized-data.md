# Retrofitting Summarized Data

This is a relatively straightforward requirements document describing a retrofit to this product, moving away from older API endpoints. We are going to rework this project step-wise, our first challenge is just changing out one of the service endpoints and any dependent calls we reasonalby need to test the happy-path.

The one in question lives in site-or-summary-vis-selection.ts, the call to getSummarizedData.

We want to touch as few lines of code as possible. There are greater opportunities to refactor this code later, but for now, we focus purely on getting this endpoint call working.

The new endpoint for this call is: https://services2-dev.usanpn.org/v1/data/individual_phenometrics

We should assume that the payload from the endpoint should be comparable to that what we get today, but we may need to iterate on errors, rather than try to plan it perfectly from the first move. 

In a production environment the URL would be services.usanpn.org or something similar, but that needs to be exchangable as it is today. 

We do however want to make sure that the new endpoint changes are centralized in network.service.ts as it is today, and configurable through a configuration file.

Keep this basic and simple for now.