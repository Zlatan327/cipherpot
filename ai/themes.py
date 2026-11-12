"""
Theme Generator & Multi-Board Provider for CipherPot.
Generates alternate closed-universe 64-candidate datasets to demonstrate
that the deduction engine is domain-agnostic.
"""

import json
from pathlib import Path

SCIENCE_CANDIDATES = [
    # Ancient
    ("Wheel", "Ancient Technology", "Ancient", "Mesopotamia", "Mechanical Tool"),
    ("Abacus", "Ancient Computing", "Ancient", "Mesopotamia", "Calculating Device"),
    ("Papyrus", "Materials & Writing", "Ancient", "Egypt", "Writing Medium"),
    ("Sundial", "Timekeeping", "Ancient", "Egypt", "Astronomical Instrument"),
    ("Water Clock", "Timekeeping", "Ancient", "Egypt", "Hydraulic Device"),
    ("Archimedes Screw", "Mechanical Engineering", "Ancient", "Greece", "Hydraulic Pump"),
    ("Astrolabe", "Astronomy", "Ancient", "Greece", "Navigational Tool"),
    ("Antikythera Mechanism", "Ancient Computing", "Ancient", "Greece", "Gear Calendar"),
    ("Compass", "Navigation", "Ancient", "China", "Magnetic Pointer"),
    ("Paper Making", "Materials & Writing", "Ancient", "China", "Information Medium"),
    ("Seismoscope", "Earth Sciences", "Ancient", "China", "Earthquake Detector"),
    ("Phaistos Disc", "Ancient Artifacts", "Ancient", "Crete", "Impressed Inscription"),
    ("Roman Concrete", "Materials Engineering", "Ancient", "Rome", "Hydraulic Mortar"),
    ("Hero's Aeolipile", "Thermodynamics", "Ancient", "Alexandria", "Steam Reaction Turbine"),
    ("Pinhole Camera", "Optics", "Ancient", "China", "Light Projection"),
    ("Glass Blowing", "Materials Science", "Ancient", "Syria", "Vessel Manufacturing"),

    # Medieval
    ("Printing Press", "Information & Media", "Medieval", "Germany", "Movable Type"),
    ("Mechanical Clock", "Timekeeping", "Medieval", "Europe", "Escapement Clock"),
    ("Gunpowder", "Chemical Engineering", "Medieval", "China", "Explosive Mixture"),
    ("Spectacles", "Optics", "Medieval", "Italy", "Convex Glass Lenses"),
    ("Hourglass", "Timekeeping", "Medieval", "Europe", "Sand Glass Timer"),
    ("Windmill", "Mechanical Engineering", "Medieval", "Persia", "Rotary Power Mill"),
    ("Blast Furnace", "Metallurgy", "Medieval", "Europe", "Iron Smelting"),
    ("Sternpost Rudder", "Maritime Engineering", "Medieval", "China", "Directional Rudder"),
    ("Alembic Still", "Alchemy & Chemistry", "Medieval", "Arab World", "Distillation Vessel"),
    ("Camera Obscura", "Optics", "Medieval", "Arab World", "Dark Room Projection"),
    ("Paper Mill", "Manufacturing", "Medieval", "Arab World", "Watermill Pulverizer"),
    ("Dry Mariners Compass", "Maritime Navigation", "Medieval", "Italy", "Gimbal Compass"),
    ("Equestrian Stirrup", "Military Engineering", "Medieval", "China", "Saddle Support"),
    ("Spinning Wheel", "Textile Engineering", "Medieval", "India", "Spindle Mechanism"),
    ("Counterweight Trebuchet", "Ballistics", "Medieval", "France", "Gravity Lever Siege"),
    ("Astrolabic Quadrant", "Astronomy", "Medieval", "Arab World", "Solar Alt-azimuth Tool"),

    # Modern
    ("Telescope", "Astronomy & Optics", "Modern", "Netherlands", "Refracting Optical Tube"),
    ("Microscope", "Biology & Optics", "Modern", "Netherlands", "Compound Microscope"),
    ("Mercury Barometer", "Atmospheric Physics", "Modern", "Italy", "Torricellian Vacuum"),
    ("Watt Steam Engine", "Industrial Revolution", "Modern", "Scotland", "Condenser Steam Engine"),
    ("Lightning Rod", "Atmospheric Electricity", "Modern", "United States", "Grounding Conductor"),
    ("Voltaic Pile", "Electromagnetism", "Modern", "Italy", "Chemical Battery"),
    ("Electric Motor", "Electromagnetism", "Modern", "United Kingdom", "Rotary Field Coil"),
    ("Telegraph", "Telecommunications", "Modern", "United States", "Electromagnetic Morse Relay"),
    ("Dynamite", "Chemical Engineering", "Modern", "Sweden", "Kieselguhr Nitroglycerin"),
    ("Telephone", "Telecommunications", "Modern", "United States", "Acoustic-Electric Diaphragm"),
    ("Incandescent Lamp", "Lighting & Power", "Modern", "United States", "Carbon Filament Bulb"),
    ("Wireless Radio", "Telecommunications", "Modern", "Italy", "Radiofrequency Spark Gap"),
    ("X-Ray Tube", "Medical Physics", "Modern", "Germany", "Roentgen Vacuum Ray"),
    ("Wright Flyer", "Aviation Engineering", "Modern", "United States", "Powered Biplane"),
    ("Penicillin", "Medicine & Pharmacology", "Modern", "United Kingdom", "Antibiotic Mold Secretion"),
    ("Electron Microscope", "Nanotechnology", "Modern", "Germany", "Electromagnetic Lens Beam"),

    # Digital & Contemporary
    ("Transistor", "Semiconductor Physics", "Digital", "United States", "Solid State Switch"),
    ("DNA Double Helix", "Molecular Genetics", "Digital", "United Kingdom", "Base Pair Polymer"),
    ("Polio Vaccine", "Immunology", "Digital", "United States", "Inactivated Virus"),
    ("Integrated Circuit", "Semiconductor Electronics", "Digital", "United States", "Monolithic Silicon Chip"),
    ("Optical Laser", "Quantum Electronics", "Digital", "United States", "Stimulated Emission Beam"),
    ("ARPANET Protocol", "Distributed Systems", "Digital", "United States", "Packet Switching IMP"),
    ("Personal Computer", "Computing", "Digital", "United States", "Microprocessor Terminal"),
    ("MRI Scanner", "Medical Physics", "Digital", "United States", "Nuclear Magnetic Imager"),
    ("PCR Gene Amplification", "Biotechnology", "Digital", "United States", "Taq Polymerase Cycling"),
    ("World Wide Web", "Hypermedia Systems", "Digital", "Switzerland", "HTTP/HTML Protocol"),
    ("GPS Constellation", "Satellite Navigation", "Digital", "United States", "Atomic Clock Orbiters"),
    ("Lithium-Ion Battery", "Energy Storage", "Digital", "Japan", "Intercalation Power Cell"),
    ("CRISPR-Cas9", "Genetic Engineering", "Digital", "United States", "Targeted RNA Endonuclease"),
    ("Superconducting Qubit", "Quantum Computing", "Digital", "United States", "Josephson Junction Qubit"),
    ("Transformer Model", "Artificial Intelligence", "Digital", "United States", "Self-Attention Neural Network"),
    ("Fusion Net Ignition", "Energy Physics", "Digital", "United States", "Inertial Confinement Target"),
]

def generate_science_board():
    candidates = []
    for i, (name, cat, era, origin, typ) in enumerate(SCIENCE_CANDIDATES, 1):
        candidates.append({
            "id": i,
            "name": name,
            "category": cat,
            "era": era,
            "origin": origin,
            "type": typ,
        })
    return {
        "theme": "science_inventions",
        "title": "Greatest Scientific Breakthroughs & Inventions",
        "total": len(candidates),
        "candidates": candidates,
    }

if __name__ == "__main__":
    board_data = generate_science_board()
    root_path = Path(__file__).parent.parent / "board_science.json"
    pub_path = Path(__file__).parent.parent / "frontend" / "public" / "board_science.json"

    with open(root_path, "w", encoding="utf-8") as f:
        json.dump(board_data, f, indent=2)
    with open(pub_path, "w", encoding="utf-8") as f:
        json.dump(board_data, f, indent=2)

    print(f"Exported {len(board_data['candidates'])} candidates to {root_path} and {pub_path}")
