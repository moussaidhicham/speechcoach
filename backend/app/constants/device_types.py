"""
Device type constants.
"""

DEVICE_TYPES = {
    'auto': 'Auto-détection',
    'unknown': 'Inconnu',
    'laptop_desktop': 'Ordinateur portable/bureau',
    'tablet': 'Tablette',
    'smartphone': 'Smartphone',
}

VALID_DEVICE_TYPES = set(DEVICE_TYPES.keys())

def is_valid_device_type(device_type: str) -> bool:
    """Check if a device type is valid."""
    return device_type in VALID_DEVICE_TYPES

def normalize_device_type(device_type: str) -> str:
    """Normalize device type to valid value."""
    if not device_type or device_type == 'unknown':
        return 'unknown'
    if device_type in VALID_DEVICE_TYPES:
        return device_type
    return 'unknown'
