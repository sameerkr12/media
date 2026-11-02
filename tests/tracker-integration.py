"""Compatibility entry point for the Supabase integration suite."""
from pathlib import Path
import subprocess
raise SystemExit(subprocess.call(['node', str(Path(__file__).with_name('supabase-integration.mjs'))]))
