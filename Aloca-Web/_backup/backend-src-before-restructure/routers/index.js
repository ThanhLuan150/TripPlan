import authRouter from "./authRouter.js";
import chatAIRouter from "./chatAIRouter.js";
import userRouter from "./userRouter.js";
import tripPlannerRouter from "./tripPlannerRouter.js";
import rankingRouter from "./rankingRouter.js";
import challengeRouter from "./challengeRouter.js";

function route(app) {
    app.use("/auth", authRouter)
    app.use("/user", userRouter)
    app.use("/chat", chatAIRouter)
    app.use("/trip-plan", tripPlannerRouter)
    app.use("/rankings", rankingRouter)
    app.use("/challenge", challengeRouter)
}
export default route;
