#!/usr/bin/env python3
"""Tests isolés de l'archivage ; ne touchent pas au vrai workspace."""
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "creer-archive.py"


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="vigie-archive-test-")
        self.workspace = Path(self.tmp.name)
        self.project = self.workspace / "cq-auto"
        paths = [
            "README.md", "INSTALLER.md", "index.html", "css/style.css", "js/app.js", "js/gps.js",
            "js/catalogue.js", "data/brands_models_fr.json",
            "assets/logo-original.png", "icons/icon.png", "docs/HISTORIQUE.md",
            "docs/CAHIER-DES-CHARGES.md", "docs/FEUILLE-DE-ROUTE.md",
        ]
        for rel in paths:
            path = self.project / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b"fixture")
        (self.project / "scripts").mkdir()
        shutil.copy2(SCRIPT, self.project / "scripts" / "creer-archive.py")
        shutil.copy2(SCRIPT.parent / "gestion_archives.py", self.project / "scripts" / "gestion_archives.py")
        version = "2.0.0"
        (self.project / "js/app.js").write_text('const APP_VERSION = "2.0.0";')
        (self.project / "package.json").write_text(json.dumps({"version": version}))
        (self.project / "package-lock.json").write_text(json.dumps({"version": version, "packages": {"": {"version": version}}}))
        (self.project / "manifest.webmanifest").write_text(json.dumps({"icons": [{"src": "./icons/icon.png?v=1"}]}))
        (self.project / "sw.js").write_text('const CACHE = "cq-auto-app-v2.0.0";')
        self.old = {
            "VigieAuto-v1.3.1.zip": b"current-old", "CQ-Auto-v1.2.0.zip": b"older",
            "CQ-Auto-v1.1.1.zip": b"oldest", "VigieAuto.zip": b"current-old",
            "CQ-Auto.zip": b"older", "mes-sauvegardes.zip": b"user data",
        }
        for name, content in self.old.items():
            (self.workspace / name).write_bytes(content)

    def tearDown(self):
        self.tmp.cleanup()

    def run_script(self, *args):
        return subprocess.run(["python3", str(self.project / "scripts/creer-archive.py"), *args],
                              text=True, capture_output=True, check=False)

    def test_dry_run_is_non_destructive(self):
        result = self.run_script("--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((self.workspace / "VigieAuto-v2.0.0.zip").exists())
        for name, content in self.old.items():
            self.assertEqual((self.workspace / name).read_bytes(), content)

    def test_verified_release_keeps_three_versions_and_personal_zip(self):
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        archive = self.workspace / "VigieAuto-v2.0.0.zip"
        with ZipFile(archive) as z:
            self.assertIsNone(z.testzip())
            self.assertIn("VigieAuto/docs/HISTORIQUE.md", z.namelist())
            self.assertIn("VigieAuto/assets/logo-original.png", z.namelist())
        self.assertEqual(sorted(p.name for p in self.workspace.glob("*.zip")), sorted([
            "VigieAuto-v2.0.0.zip", "VigieAuto-v1.3.1.zip", "CQ-Auto-v1.2.0.zip", "mes-sauvegardes.zip",
        ]))
        self.assertEqual((self.workspace / "mes-sauvegardes.zip").read_bytes(), b"user data")
        first = archive.read_bytes()
        repeat = self.run_script()
        self.assertNotEqual(repeat.returncode, 0)
        self.assertEqual(archive.read_bytes(), first)

    def test_failed_validation_never_prunes(self):
        (self.project / "docs/HISTORIQUE.md").unlink()
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.workspace / "VigieAuto-v2.0.0.zip").exists())
        self.assertFalse((self.workspace / ".VigieAuto-v2.0.0.tmp").exists())
        for name, content in self.old.items():
            self.assertEqual((self.workspace / name).read_bytes(), content)

    def test_different_alias_is_not_removed(self):
        (self.workspace / "VigieAuto.zip").write_bytes(b"not an identical copy")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.workspace / "VigieAuto.zip").read_bytes(), b"not an identical copy")

    def test_identical_duplicate_of_a_kept_version_is_removed(self):
        (self.workspace / "CQ-Auto-v1.3.1.zip").write_bytes(b"current-old")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.workspace / "VigieAuto-v1.3.1.zip").exists())
        self.assertFalse((self.workspace / "CQ-Auto-v1.3.1.zip").exists())

    def test_nonidentical_duplicate_of_a_kept_version_is_preserved(self):
        duplicate = self.workspace / "CQ-Auto-v1.3.1.zip"
        duplicate.write_bytes(b"different content")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(duplicate.read_bytes(), b"different content")
        self.assertIn("Attention", result.stdout)

    def test_version_mismatch_and_unclassified_files_stop_safely(self):
        (self.project / "sw.js").write_text('const CACHE = "cq-auto-app-v1.0.0";')
        self.assertNotEqual(self.run_script().returncode, 0)
        (self.project / "sw.js").write_text('const CACHE = "cq-auto-app-v2.0.0";')
        (self.project / "js/app.js").write_text('const APP_VERSION = "1.0.0";')
        self.assertNotEqual(self.run_script().returncode, 0)
        (self.project / "js/app.js").write_text('const APP_VERSION = "2.0.0";')
        (self.project / "new-unreviewed-folder").mkdir()
        self.assertNotEqual(self.run_script().returncode, 0)
        for name, content in self.old.items():
            self.assertEqual((self.workspace / name).read_bytes(), content)

    def test_two_branches_keep_three_releases_not_highest_semver(self):
        android = self.workspace / "VigieAuto-Android-v0.1.0.zip"
        android.write_bytes(b"android project")
        result = self.run_script()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(android.exists())
        self.assertTrue((self.workspace / "VigieAuto-v2.0.0.zip").exists())
        self.assertTrue((self.workspace / "VigieAuto-v1.3.1.zip").exists())
        self.assertFalse((self.workspace / "CQ-Auto-v1.2.0.zip").exists())
        self.assertTrue((self.workspace / "mes-sauvegardes.zip").exists())

    def test_release_version_must_be_newer(self):
        (self.workspace / "VigieAuto-v2.1.0.zip").write_bytes(b"newer")
        result = self.run_script()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.workspace / "VigieAuto-v2.0.0.zip").exists())
        for name, content in self.old.items():
            self.assertEqual((self.workspace / name).read_bytes(), content)


if __name__ == "__main__":
    unittest.main(verbosity=2)
