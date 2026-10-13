@app.on_event("shutdown")
async def shutdown() -> None:
    await get_deepseek_client().close()
    logger.info("THE AGENT — Backend shutting down")

if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.getenv("PORT", "10000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
