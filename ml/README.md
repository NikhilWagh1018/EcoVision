# ML workspace

Pipeline: collect -> auto-label (Grounding DINO + SAM) -> correct in Label Studio -> train -> export ONNX -> copy to `api/weights/`.

## Dataset layout (YOLO segmentation + classification labels)
```
data/
  images/{train,val,test}/*.jpg
  labels_seg/{train,val,test}/*.txt     # YOLO-seg polygons, single class: waste
  cls_labels.csv                        # image,severity,bagged,loose,burnt,mixed,near_drain,location_id
```
Split by `location_id`, never by random image (before/after and repeat photos of one spot look alike).

## Commands
```
pip install ultralytics timm torch torchvision scikit-learn albumentations
python train_seg.py --data configs/seg.yaml
python train_cls.py --csv data/cls_labels.csv --img-dir data/images
python export_onnx.py
```
Your existing Colab notebooks (Annotation.ipynb, waste_pipeline.ipynb) belong in `autolabel/`; move the logic of `autolabel.py` there as a script.
