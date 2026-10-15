import torch
from train_cls import Net

net = Net(); net.load_state_dict(torch.load("severity_v1.pt", map_location="cpu")); net.eval()
torch.onnx.export(net, torch.randn(1, 3, 256, 256), "../api/weights/severity_v1.onnx",
                  input_names=["image"], output_names=["severity", "tags"], opset_version=17)
# Segmenter: from ultralytics import YOLO; YOLO("runs/seg/weights/best.pt").export(format="onnx")
# then copy to api/weights/segmenter_v1.onnx
