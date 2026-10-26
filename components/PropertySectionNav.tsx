"use client";
import { useEffect, useRef, useState } from "react";
const allSections = [
  {
    id: "resumen",
    label: "Resumen",
    path: "m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z",
  },
  {
    id: "recorrido",
    label: "Recorrido 360°",
    path: "M4 8h16v12H4ZM8 8l2-4h4l2 4M15 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  },
  {
    id: "ubicacion",
    label: "Ubicación",
    path: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  },
  {
    id: "costos",
    label: "Costos",
    path: "M5 3h14v18H5ZM8 7h8M8 11h1m3 0h1m3 0h.1M8 15h1m3 0h1m3 0h.1",
  },
];
export function PropertySectionNav({
  withTour = true,
}: {
  withTour?: boolean;
}) {
  const sections = allSections.filter(
    (section) => withTour || section.id !== "recorrido",
  );
  const [active, setActive] = useState("resumen");
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    function update() {
      if (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 4
      ) {
        setActive(sections[sections.length - 1].id);
        return;
      }
      const threshold = (navigation.current?.offsetHeight ?? 78) + 48;
      let current = sections[0].id;
      for (const { id } of sections) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= threshold)
          current = id;
      }
      setActive(current);
    }
    function schedule() {
      if (!frame)
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          update();
        });
    }
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [withTour]);
  return (
    <nav
      ref={navigation}
      className="property-section-nav"
      aria-label="Secciones del inmueble"
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? "location" : undefined}
          onClick={() => setActive(section.id)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={section.path} />
          </svg>
          <span>{section.label}</span>
          <span className="section-dot" aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
