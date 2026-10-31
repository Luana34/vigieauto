#!/usr/bin/env python3
"""Créer une archive VigieAuto vérifiée et garder trois versions de projet.

Utilisation : python3 scripts/creer-archive.py
Le script ne supprime ni données personnelles ni ZIP inconnus. Il n'écrase
jamais une archive versionnée existante. Exécuter les tests avant ce script.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from gestion_archives import identity, prune_known_archives

PROJECT = Path(__file__).resolve().parent.parent
WORKSPACE = PROJECT.parent
ROOT_NAME = "VigieAuto"
ALLOWED_FILES = {
    "README.md", "INSTALLER.md", "index.html", "manifest.webmanifest",
    "sw.js", "package.json", "package-lock.json",
}
ALLOWED_DIRS = {"assets", "css", "data", "docs", "icons", "js", "scripts", "tests"}
IGNORED_DIRS = {"node_modules", ".git", ".cache", "__pycache__", "coverage", "dist", "build"}
ARCHIVE_PATTERN = re.compile(r"^(?:VigieAuto|CQ-Auto)-v(\d+)\.(\d+)\.(\d+)\.zip$")
ALIASES = ("VigieAuto.zip", "CQ-Auto.zip")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def archive_version(path: Path) -> tuple[int, int, int] | None:
    m = ARCHIVE_PATTERN.fullmatch(path.name)
    return tuple(map(int, m.groups())) if m else None


def project_files() -> list[Path]:
    unknown = [p.name for p in PROJECT.iterdir() if p.name not in ALLOWED_FILES | ALLOWED_DIRS | IGNORED_DIRS]
    if unknown:
        raise RuntimeError("Éléments non classés dans le projet : " + ", ".join(sorted(unknown)))
    files: list[Path] = []
    for path in PROJECT.rglob("*"):
        rel = path.relative_to(PROJECT)
        if any(part in IGNORED_DIRS for part in rel.parts):
            continue
        if path.is_symlink():
            raise RuntimeError(f"Lien symbolique non inclus sans vérification : {rel}")
        if not path.is_file():
            continue
        if rel.parts[0] not in ALLOWED_DIRS and str(rel) not in ALLOWED_FILES:
            raise RuntimeError(f"Fichier non classé : {rel}")
        if path.name.startswith(".env") or path.suffix.lower() in {".pem", ".key", ".p12", ".pfx"}:
            raise RuntimeError(f"Fichier potentiellement sensible à exclure : {rel}")
        files.append(path)
    return sorted(files)


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1:] != ["--dry-run"]:
        raise RuntimeError("Usage : python3 scripts/creer-archive.py [--dry-run]")
    dry_run = sys.argv[1:] == ["--dry-run"]
    package = json.loads((PROJECT / "package.json").read_text(encoding="utf-8"))
    version = package.get("version", "")
    if not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise RuntimeError("Version attendue au format x.y.z dans package.json.")
    lock = json.loads((PROJECT / "package-lock.json").read_text(encoding="utf-8"))
    if lock.get("version") != version or lock.get("packages", {}).get("", {}).get("version") != version:
        raise RuntimeError("La version de package-lock.json ne correspond pas à package.json.")
    app_js = (PROJECT / "js/app.js").read_text(encoding="utf-8")
    if not re.search(r'const APP_VERSION\s*=\s*"' + re.escape(version) + r'"', app_js):
        raise RuntimeError("La version affichée dans js/app.js ne correspond pas à package.json.")
    sw = (PROJECT / "sw.js").read_text(encoding="utf-8")
    if not re.search(r'const CACHE\s*=\s*"[^"]+-v' + re.escape(version) + r'"', sw):
        raise RuntimeError("La version du cache de sw.js ne correspond pas à package.json.")
    destination = WORKSPACE / f"VigieAuto-v{version}.zip"
    temporary = WORKSPACE / f".VigieAuto-v{version}.tmp"
    if destination.exists():
        raise RuntimeError(f"Archive déjà présente, aucune modification : {destination.name}")
    existing_versions = [archive_version(p) for p in WORKSPACE.iterdir() if p.is_file() and archive_version(p) is not None]
    if existing_versions and tuple(map(int, version.split("."))) <= max(existing_versions):
        raise RuntimeError("La nouvelle version doit être supérieure aux archives existantes.")
    files = project_files()
    print(f"Archive prévue : {destination.name} ({len(files)} fichiers).")
    if dry_run:
        print("Simulation seulement : aucune archive créée, aucun fichier supprimé.")
        return
    if temporary.exists():
        raise RuntimeError(f"Fichier temporaire déjà présent : {temporary.name}")
    try:
        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as z:
            for p in files:
                z.write(p, f"{ROOT_NAME}/{p.relative_to(PROJECT).as_posix()}")
        with ZipFile(temporary) as z:
            if z.testzip() is not None:
                raise RuntimeError("Archive corrompue : aucune ancienne version ne sera supprimée.")
            names = set(z.namelist())
            required = {
                f"{ROOT_NAME}/index.html", f"{ROOT_NAME}/sw.js", f"{ROOT_NAME}/package.json",
                f"{ROOT_NAME}/package-lock.json", f"{ROOT_NAME}/manifest.webmanifest",
                f"{ROOT_NAME}/js/app.js", f"{ROOT_NAME}/js/gps.js", f"{ROOT_NAME}/css/style.css",
                f"{ROOT_NAME}/js/catalogue.js", f"{ROOT_NAME}/data/brands_models_fr.json",
                f"{ROOT_NAME}/assets/logo-original.png", f"{ROOT_NAME}/README.md",
                f"{ROOT_NAME}/docs/HISTORIQUE.md", f"{ROOT_NAME}/docs/CAHIER-DES-CHARGES.md",
                f"{ROOT_NAME}/docs/FEUILLE-DE-ROUTE.md", f"{ROOT_NAME}/INSTALLER.md",
                f"{ROOT_NAME}/scripts/creer-archive.py", f"{ROOT_NAME}/scripts/gestion_archives.py",
            }
            if not required <= names:
                raise RuntimeError("Fichiers indispensables absents de l’archive.")
            manifest = json.loads(z.read(f"{ROOT_NAME}/manifest.webmanifest"))
            for icon in manifest.get("icons", []):
                icon_path = icon["src"].removeprefix("./").split("?", 1)[0]
                if f"{ROOT_NAME}/{icon_path}" not in names:
                    raise RuntimeError(f"Icône absente de l’archive : {icon_path}")
        temporary.replace(destination)
    finally:
        if temporary.exists():
            temporary.unlink()

    # Les branches Web et Android ont des numéros indépendants. La politique
    # commune garde les trois dernières versions de projet au total.
    candidates = [p for p in WORKSPACE.iterdir() if p.is_file() and identity(p) is not None]
    hashes = {sha256(p) for p in candidates}
    kept, removed, warnings = prune_known_archives(WORKSPACE, destination)
    for warning in warnings:
        print("Attention : " + warning)
    for name in ALIASES:
        path = WORKSPACE / name
        if path.is_file() and sha256(path) in hashes:
            path.unlink()
            removed.append(name)
    print(f"Archive vérifiée : {destination.name} · SHA-256 {sha256(destination)}")
    print("Archives de versions conservées : " + ", ".join(p.name for p in kept))
    print("Anciennes archives/doublons supprimés : " + (", ".join(removed) if removed else "aucun"))
    print("Les autres fichiers ZIP, notamment les sauvegardes personnelles, ne sont pas touchés.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, RuntimeError) as exc:
        print(f"Erreur : {exc}", file=sys.stderr)
        sys.exit(1)
