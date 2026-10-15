"""Severity (3-class) + tags (5 multi-label) with one EfficientNet-B0 backbone."""
import argparse
import pandas as pd
import timm
import torch
import torch.nn as nn
from PIL import Image
from sklearn.metrics import f1_score
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms as T

SEV = ["clean", "moderate", "severe"]
TAGS = ["bagged", "loose", "burnt", "mixed", "near_drain"]


class DS(Dataset):
    def __init__(self, df, img_dir, train):
        self.df, self.dir = df.reset_index(drop=True), img_dir
        aug = [T.RandomHorizontalFlip(), T.ColorJitter(0.3, 0.3, 0.3)] if train else []
        self.tf = T.Compose([T.Resize((256, 256)), *aug, T.ToTensor(),
                             T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])

    def __len__(self): return len(self.df)

    def __getitem__(self, i):
        r = self.df.iloc[i]
        x = self.tf(Image.open(f"{self.dir}/{r['image']}").convert("RGB"))
        return x, SEV.index(r["severity"]), torch.tensor(r[TAGS].values.astype("float32"))


class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.b = timm.create_model("efficientnet_b0", pretrained=True, num_classes=0)
        self.sev = nn.Linear(self.b.num_features, len(SEV))
        self.tag = nn.Linear(self.b.num_features, len(TAGS))

    def forward(self, x):
        f = self.b(x)
        return self.sev(f), self.tag(f)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True); ap.add_argument("--img-dir", required=True)
    ap.add_argument("--epochs", type=int, default=15)
    a = ap.parse_args()
    torch.manual_seed(42)
    df = pd.read_csv(a.csv)
    # Split BY LOCATION so near-identical photos of one spot never cross splits
    locs = df["location_id"].drop_duplicates().sample(frac=1, random_state=42).tolist()
    n = len(locs); tr, va = set(locs[: int(.7 * n)]), set(locs[int(.7 * n): int(.85 * n)])
    d_tr, d_va = df[df.location_id.isin(tr)], df[df.location_id.isin(va)]
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    net = Net().to(dev); opt = torch.optim.AdamW(net.parameters(), 3e-4)
    ce, bce = nn.CrossEntropyLoss(), nn.BCEWithLogitsLoss()
    L = DataLoader(DS(d_tr, a.img_dir, True), 32, shuffle=True)
    V = DataLoader(DS(d_va, a.img_dir, False), 32)
    for ep in range(a.epochs):
        net.train()
        for x, ys, yt in L:
            x, ys, yt = x.to(dev), ys.to(dev), yt.to(dev)
            o_s, o_t = net(x); loss = ce(o_s, ys) + bce(o_t, yt)
            opt.zero_grad(); loss.backward(); opt.step()
        net.eval(); P, Y = [], []
        with torch.no_grad():
            for x, ys, _ in V:
                P += net(x.to(dev))[0].argmax(1).cpu().tolist(); Y += ys.tolist()
        print(f"epoch {ep+1}: val macro-F1 = {f1_score(Y, P, average='macro'):.3f}")
    torch.save(net.state_dict(), "severity_v1.pt")
