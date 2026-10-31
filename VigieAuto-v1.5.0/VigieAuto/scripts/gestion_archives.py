#!/usr/bin/env python3
"""Classe les ZIP de projet Web et Android, sans toucher aux sauvegardes personnelles.

Les versions d’une même branche sont ordonnées sémantiquement. Les branches sont
intercalées selon la date du fichier de leur version de tête ; donc jamais comparer
0.1 Android à 1.4 Web comme s’il s’agissait du même produit.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

WEB = re.compile(r"^(?:VigieAuto|CQ-Auto)-v(\d+)\.(\d+)\.(\d+)\.zip$")
ANDROID = re.compile(r"^VigieAuto-Android-v(\d+)\.(\d+)\.(\d+)\.zip$")


def identity(path: Path):
    for stream, pattern in (("web", WEB), ("android", ANDROID)):
        m = pattern.fullmatch(path.name)
        if m:
            return stream, tuple(map(int, m.groups()))
    return None


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ordered_groups(paths: list[Path]):
    groups = {}
    for p in paths:
        key = identity(p)
        if key is not None:
            groups.setdefault(key, []).append(p)
    streams = {}
    for key in groups:
        streams.setdefault(key[0], []).append(key)
    for keys in streams.values():
        keys.sort(key=lambda k: k[1], reverse=True)
    result = []
    while any(streams.values()):
        heads = [keys[0] for keys in streams.values() if keys]
        # La date d'une archive de tête permet uniquement de comparer des branches distinctes.
        winner = max(heads, key=lambda k: (max(p.stat().st_mtime_ns for p in groups[k]), k[0] == "android"))
        result.append(winner)
        streams[winner[0]].pop(0)
    return groups, result


def prune_known_archives(workspace: Path, preferred: Path, limit: int = 3):
    candidates = [p for p in workspace.iterdir() if p.is_file() and identity(p) is not None]
    groups, ordered = ordered_groups(candidates)
    keep = set(ordered[:limit])
    removed, warnings = [], []
    for key, files in groups.items():
        if key not in keep:
            for p in files:
                p.unlink(); removed.append(p.name)
            continue
        files.sort(key=lambda p: (p != preferred, not p.name.startswith("VigieAuto-"), p.name))
        first_hash = sha256(files[0])
        for duplicate in files[1:]:
            if sha256(duplicate) == first_hash:
                duplicate.unlink(); removed.append(duplicate.name)
            else:
                warnings.append(f"Deux archives différentes pour {key} : {duplicate.name} conservée.")
    kept = [p for key in ordered[:limit] for p in groups[key] if p.exists()]
    return kept, removed, warnings
