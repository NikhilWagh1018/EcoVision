import argparse
from ultralytics import YOLO

p = argparse.ArgumentParser()
p.add_argument("--data", default="configs/seg.yaml")
p.add_argument("--model", default="yolov8n-seg.pt")
p.add_argument("--epochs", type=int, default=100)
p.add_argument("--imgsz", type=int, default=640)
a = p.parse_args()

model = YOLO(a.model)
model.train(data=a.data, epochs=a.epochs, imgsz=a.imgsz, seed=42, project="runs", name="seg")
model.val(split="test")
