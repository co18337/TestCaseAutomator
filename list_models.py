# list_models.py
import os
import google.generativeai as genai

# Prefer reading the key from env, but you can also set it here for testing:
API_KEY = os.getenv("GENAI_API_KEY") or "AIzaSyCjrN_hseciV6VerVP-w-bMqrXncMOHa_s"
genai.configure(api_key=API_KEY)

models = genai.list_models()

if not models:
    print("No models returned. Check your API key / network / permissions.")
    raise SystemExit(1)

print("Available models (detailed):\n")
for i, m in enumerate(models, start=1):
    print(f"--- Model #{i} ---")
    # many model objects expose .name and .display_name; print those if present
    name = getattr(m, "name", None)
    display_name = getattr(m, "display_name", None)
    # fallback: show representation and attributes for debugging
    print("type:", type(m))
    if name:
        print("name:", name)
    if display_name:
        print("display_name:", display_name)
    # attempt to show any capability-like fields if available
    for attr in ("capabilities", "supported_generation", "description", "id"):
        val = getattr(m, attr, None)
        if val:
            print(f"{attr}:", val)
    # If nothing printed, dump a short dir() so you can inspect attributes
    if not (name or display_name):
        print("dir(m):", [a for a in dir(m) if not a.startswith("_")][:50])
    print()
