"use client";

import "./CreditsModal.css";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";

type CreditsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ASSET_CREDITS = [
  {
    title: "Smartphone — iPhone 14 Pro Pack",
    author: "Imagigoo",
    sourceHref:
      "https://sketchfab.com/3d-models/apple-iphone-14-pro-pack-free-2893bdaefdf946ab92ffd04ecfba843b",
    sourceLabel: "Sketchfab",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    licenseLabel: "CC BY 4.0",
  },
  {
    title: 'Notebook — MacBook Pro 14" M5',
    author: "@apple-user",
    sourceHref:
      "https://sketchfab.com/3d-models/macbook-pro-14-inch-m5-652a992f4f244122ae251f9cbb81da1e",
    sourceLabel: "Sketchfab",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    licenseLabel: "CC BY 4.0",
  },
  {
    title: "Smartwatch",
    author: "@_Tegarma",
    sourceHref:
      "https://sketchfab.com/3d-models/smartwatch-8a0964b8451b40f09b7cb377058f9d3c",
    sourceLabel: "Sketchfab",
    licenseHref: "https://creativecommons.org/licenses/by/4.0/",
    licenseLabel: "CC BY 4.0",
  },
  {
    title: "Smartphone — iPhone 8",
    author: "egosimx",
    sourceHref: "https://free3d.com/3d-model/iphone-8-84108.html",
    sourceLabel: "Free3D",
    licenseHref: "",
    licenseLabel: "Personal Use",
    warning:
      "Used strictly for educational/portfolio purposes, no monetization involved. Author may request removal at any time.",
  },
] as const;

export default function CreditsModal({
  isOpen,
  onClose,
}: CreditsModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="credits-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="credits-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-modal-title"
      >
        <div className="credits-modal-header">
          <div>
            <p className="credits-modal-eyebrow">3D Assets & Credits</p>
            <h2 id="credits-modal-title" className="credits-modal-title">
              Attributions
            </h2>
          </div>

          <button
            type="button"
            className="credits-modal-close"
            onClick={onClose}
            aria-label="Close credits"
            title="Close credits"
          >
            <X size={16} />
          </button>
        </div>

        <div className="credits-modal-body">
          <p className="credits-modal-intro">
            This is a personal/study project with no commercial intent. All 3D
            models are used with proper attribution as required by their licenses.
          </p>

          <div className="credits-modal-list">
            {ASSET_CREDITS.map((item) => (
              <section key={item.title} className="credits-card">
                <h3 className="credits-card-title">{item.title}</h3>
                <p className="credits-card-line">
                  <span>Author:</span> {item.author}
                </p>
                <p className="credits-card-line">
                  <span>Source:</span>{" "}
                  <a
                    href={item.sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="credits-link"
                  >
                    {item.sourceLabel}
                    <ExternalLink size={12} />
                  </a>
                </p>
                <p className="credits-card-line">
                  <span>License:</span>{" "}
                  {item.licenseHref ? (
                    <a
                      href={item.licenseHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="credits-link"
                    >
                      {item.licenseLabel}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    item.licenseLabel
                  )}
                </p>
                {item.warning ? (
                  <p className="credits-card-warning">{item.warning}</p>
                ) : null}
              </section>
            ))}
          </div>

          <div className="credits-modal-footer">
            <p>Special thanks to the artists who generously share their work with the community.</p>
            <p>Creators: if you identify any improper use of your assets, please reach out for immediate removal.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
