import os
import re
import sys
import nltk
import tempfile
import numpy as np
from typing import List, Dict, Any
from PyPDF2 import PdfReader
from nltk.tokenize import sent_tokenize
from sentence_transformers import SentenceTransformer, util
import colorama
from colorama import Fore

class ResumeRAGBot:
    def __init__(self, model_name: str = "all-mpnet-base-v2"):
        colorama.init(autoreset=True)
        print(f"{Fore.CYAN}Initializing ResumeRAGBot...")
        
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            print(f"{Fore.YELLOW}Downloading NLTK punkt...")
            nltk.download('punkt', quiet=True)

        print(f"{Fore.BLUE}Loading model {model_name}...")
        self.model = SentenceTransformer(model_name)

        self.sections = {}
        self.chunks = []
        self.embeddings = None
        self.raw_text = ""
        self.resume_metadata = {}
        self.file_path = None

        print(f"{Fore.GREEN}Initialization complete!")

    def _extract_sections(self, text: str) -> Dict[str, str]:
        common_headers = [
            "Education", "Experience", "Work Experience", "Employment", 
            "Skills", "Technical Skills", "Projects", "Certifications",
            "Awards", "Achievements", "Publications", "Languages",
            "Volunteer", "Leadership", "Activities", "Interests",
            "Professional Summary", "Summary", "Objective", "Profile",
            "References", "Internships", "Research", "Patents"
        ]
        pattern = r"(?:^|\n)(" + "|".join(re.escape(header) for header in common_headers) + r")(?:\s*:|\s*$)"
        matches = list(re.finditer(pattern, text, re.IGNORECASE))
        
        sections = {}
        for i, match in enumerate(matches):
            section_name = match.group(1).strip()
            start_pos = match.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            section_content = text[start_pos:end_pos].strip()
            sections[section_name] = section_content
        return sections

    def _extract_metadata(self, text: str) -> Dict[str, str]:
        metadata = {}
        lines = text.strip().split('\n', 5)
        if lines:
            name_candidate = next((line for line in lines if line.strip()), "")
            if len(name_candidate.split()) <= 5:
                metadata["name"] = name_candidate.strip()

        email = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email: metadata["email"] = email.group(0)

        phone = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone: metadata["phone"] = phone.group(0)

        linkedin = re.search(r'linkedin\.com/\S+', text, re.IGNORECASE)
        if linkedin: metadata["linkedin"] = linkedin.group(0)

        return metadata

    def _create_chunks(self) -> List[Dict[str, Any]]:
        chunks = []
        for section_name, section_text in self.sections.items():
            bullets = re.split(r'\n[-•●◦⦿⦾▪▫]?\s*', section_text.strip())
            for bullet in bullets:
                if bullet:
                    chunks.append({
                        "text": bullet,
                        "section": section_name.lower(),
                        "importance": 2
                    })
        return chunks

    def process_resume(self, file_path: str):
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Resume file not found: {file_path}")

        self.file_path = file_path
        print(f"{Fore.CYAN}Processing resume: {os.path.basename(file_path)}")

        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"

        self.raw_text = text
        self.resume_metadata = self._extract_metadata(text)
        self.sections = self._extract_sections(text) or {"Resume": text}
        self.chunks = self._create_chunks()

        print(f"{Fore.GREEN}Sections identified: {len(self.sections)} sections, {len(self.chunks)} chunks.")

        texts = [chunk['text'] for chunk in self.chunks]
        print(f"{Fore.BLUE}Generating embeddings...")
        self.embeddings = self.model.encode(texts, show_progress_bar=False)
        print(f"{Fore.GREEN}Embedding complete.")

def main():
    if len(sys.argv) < 2:
        print(f"{Fore.RED}Error: Please provide a path to the resume PDF.")
        sys.exit(1)

    resume_path = sys.argv[1]
    bot = ResumeRAGBot()
    bot.process_resume(resume_path)

    print(f"{Fore.GREEN}✅ Resume successfully processed!")

if __name__ == "__main__":
    main()
