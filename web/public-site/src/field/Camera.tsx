import { useEffect, useRef, useState } from "react";
import type { Capture } from "./api";

interface Props {
  title: string;
  /** Earlier photo shown faintly over the live view so the worker can match the framing. */
  ghostUrl?: string | null;
  onCapture: (c: Capture) => void;
  onCancel: () => void;
}

export default function Camera({ title, ghostUrl, onCapture, onCancel }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const fix = useRef<GeolocationPosition | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [ghostOpacity, setGhostOpacity] = useState(0.35);
  const [ghostOn, setGhostOn] = useState(true);

  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        stream = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setCamError("Camera is blocked. Allow camera access in your browser settings, then reopen this screen."));
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        fix.current = p;
        setGpsAccuracy(Math.round(p.coords.accuracy));
      },
      () => setGpsAccuracy(null),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      navigator.geolocation.clearWatch(watch);
    };
  }, []);

  const ready = gpsAccuracy !== null && !camError;

  function shoot() {
    const v = video.current, pos = fix.current;
    if (!v || !pos || !v.videoWidth) return;
    const scale = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) =>
        blob &&
        onCapture({
          blob,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString(),
        }),
      "image/jpeg",
      0.85
    );
  }

  return (
    <div className="camera">
      <video ref={video} autoPlay playsInline muted />
      {ghostUrl && ghostOn && <img className="ghost" src={ghostUrl} alt="" style={{ opacity: ghostOpacity }} />}
      <div className="camera-top">
        <button className="chip" onClick={onCancel}>Back</button>
        <strong>{title}</strong>
        <span className={`chip ${gpsAccuracy !== null && gpsAccuracy <= 20 ? "ok" : "warn"}`}>
          {gpsAccuracy === null ? "Finding location" : `GPS ±${gpsAccuracy} m`}
        </span>
      </div>
      {camError && <p className="camera-error">{camError}</p>}
      <div className="camera-bottom">
        <p className="hint">
          {ghostUrl
            ? "Line up the faint outline with the same spot, then take the photo."
            : "Stand 3 to 4 metres from the spot and keep the whole pile in view."}
        </p>
        {ghostUrl && (
          <div className="ghost-controls">
            <label>
              Outline
              <input type="range" min={0.1} max={0.7} step={0.05} value={ghostOpacity}
                onChange={(e) => setGhostOpacity(Number(e.target.value))} />
            </label>
            <button className="chip" onClick={() => setGhostOn((g) => !g)}>{ghostOn ? "Hide outline" : "Show outline"}</button>
          </div>
        )}
        <button className="shutter" disabled={!ready} onClick={shoot} aria-label="Take photo" />
      </div>
    </div>
  );
}
