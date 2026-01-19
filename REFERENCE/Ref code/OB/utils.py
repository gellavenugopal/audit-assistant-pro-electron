import os

def resource_path(relative_path):
    """
    Get absolute path to resource, works for dev and for PyInstaller.
    Returns path in current working directory for this application.
    """
    return os.path.join(os.getcwd(), relative_path)

def ensure_directory_exists(path):
    """
    Ensure the directory for the given path exists.
    """
    directory = os.path.dirname(path)
    if directory and not os.path.exists(directory):
        os.makedirs(directory)
        logging.info(f"Created directory: {directory}")