from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from app.engine_bridge import EngineBridge

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bridge = None

@app.on_event("startup")
def startup_event():
    global bridge
    bridge = EngineBridge()

@app.get("/api/simulate/precompute")
def precompute(ticks: int = 20):
    return bridge.run_precompute(ticks)

from fastapi import WebSocketDisconnect

@app.websocket("/ws/simulate")
async def simulate_stream(websocket: WebSocket):
    await websocket.accept()
    # Continuous tick streaming using the engine's internal time
    while True:
        try:
            # Run the heavy synchronous tick in a thread pool so we don't block the ASGI event loop
            data = await asyncio.to_thread(bridge._step_tick, bridge.engine.time)
            await websocket.send_json(data)
            await asyncio.sleep(1) # 1 tick per second
        except WebSocketDisconnect:
            print("Client disconnected")
            break
        except Exception as e:
            print(f"Simulation error: {e}")
            break
