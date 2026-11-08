import env from "./config/env.js";
import { connectDatabaseWithRetry } from "./config/db.js";
import app from "./app.js";

app.listen(env.port, () => {
    console.log(`Listening at ${env.port}`);
});

connectDatabaseWithRetry();
