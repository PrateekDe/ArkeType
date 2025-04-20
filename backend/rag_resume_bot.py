import os
import re
import sys
import nltk
import numpy as np
import textwrap
import tempfile
from typing import List, Dict, Tuple, Optional, Any
from PyPDF2 import PdfReader
from nltk.tokenize import sent_tokenize
import colorama
from colorama import Fore, Style
from sentence_transformers import SentenceTransformer, util

class ResumeRAGBot:
    def __init__(self, model_name: str = "all-mpnet-base-v2"):
        """
        Initialize the Resume RAG Bot with a better embedding model.
        
        Args:
            model_name: The name of the SentenceTransformer model to use
        """
        # Initialize colorama for cross-platform colored terminal output
        colorama.init(autoreset=True)
        
        print(f"{Fore.CYAN}Initializing ResumeRAGBot...")
        
        # Ensure NLTK resources are available
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            print(f"{Fore.YELLOW}Downloading NLTK resources...")
            nltk.download('punkt', quiet=True)
            
        # Load a more powerful embedding model (better semantic understanding)
        print(f"{Fore.BLUE}Loading embedding model: {model_name}...")
        self.model = SentenceTransformer(model_name)
        
        # Initialize storage
        self.sections = {}
        self.chunks = []
        self.embeddings = None
        self.raw_text = ""
        self.resume_metadata = {}
        self.file_path = None
        self.section_weights = {
            "experience": 1.3,
            "work experience": 1.3,
            "employment": 1.3,
            "education": 1.2,
            "skills": 1.2,
            "technical skills": 1.2,
            "projects": 1.1,
            "certifications": 1.0,
            "summary": 0.9,
            "profile": 0.9,
            "professional summary": 0.9,
            "objective": 0.8
        }
        
        print(f"{Fore.GREEN}ResumeRAGBot initialized and ready!")
        
    def _extract_sections(self, text: str) -> Dict[str, str]:
        """Extract resume sections based on common resume headings."""
        # Common resume section headers (extend as needed)
        common_headers = [
            "Education", "Experience", "Work Experience", "Employment", 
            "Skills", "Technical Skills", "Projects", "Certifications",
            "Awards", "Achievements", "Publications", "Languages",
            "Volunteer", "Leadership", "Activities", "Interests",
            "Professional Summary", "Summary", "Objective", "Profile",
            "References", "Personal Information", "Contact", "Internships",
            "Professional Experience", "Work History", "Career Experience",
            "Academic Background", "Qualifications", "Core Competencies",
            "Professional Development", "Training", "Research", "Patents",
            "Expertise", "Relevant Experience", "Academic Projects",
            "Additional Skills", "Languages", "Tools", "Technologies"
        ]
        
        # Create a regex pattern for identifying sections
        pattern = r"(?:^|\n)(" + "|".join(re.escape(header) for header in common_headers) + r")(?:\s*:|\s*$)"
        
        # Find all matches
        matches = list(re.finditer(pattern, text, re.IGNORECASE))
        
        sections = {}
        # Extract content for each section
        for i, match in enumerate(matches):
            section_name = match.group(1).strip()
            start_pos = match.start()
            
            # Get end position (start of next section or end of text)
            if i < len(matches) - 1:
                end_pos = matches[i + 1].start()
            else:
                end_pos = len(text)
                
            # Extract section content
            section_content = text[start_pos:end_pos].strip()
            sections[section_name] = section_content
            
        return sections
    
    def _extract_metadata(self, text: str) -> Dict[str, str]:
        """Extract basic metadata from resume text like name, contact info."""
        metadata = {}
        
        # Try to find name (usually at the beginning)
        first_lines = text.strip().split('\n', 4)
        if first_lines:
            # First non-empty line might be the name
            name_line = next((line for line in first_lines if line.strip()), "")
            if len(name_line.split()) <= 5:  # Names usually have 1-5 words
                metadata["name"] = name_line.strip()
        
        # Try to find email
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if email_match:
            metadata["email"] = email_match.group(0)
            
        # Try to find phone number
        phone_match = re.search(r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone_match:
            metadata["phone"] = phone_match.group(0)
            
        # Try to find LinkedIn
        linkedin_match = re.search(r'linkedin\.com/\S+', text, re.IGNORECASE)
        if linkedin_match:
            metadata["linkedin"] = linkedin_match.group(0)
            
        return metadata
    
    def _create_chunks(self) -> List[Dict[str, Any]]:
        """Create semantic chunks from the resume sections with improved chunking strategy."""
        chunks = []
        
        # First, process each section
        for section_name, section_content in self.sections.items():
            # Split section by bullet points or numbered lists
            bullet_pattern = r'(?:^|\n)(?:\s*[-•●◦⦿⦾⧫▪▫]|\s*\d+\.\s+|\s*[a-z]\)\s+|\s*\([a-zA-Z0-9]+\)\s+)(.*?)(?=(?:\n\s*[-•●◦⦿⦾⧫▪▫]|\n\s*\d+\.\s+|\n\s*[a-z]\)\s+|\n\s*\([a-zA-Z0-9]+\)\s+|\n\n|\Z))'
            bullet_matches = re.finditer(bullet_pattern, section_content, re.MULTILINE | re.DOTALL)
            
            bullet_points = []
            for match in bullet_matches:
                bullet_text = match.group(1).strip()
                if bullet_text:
                    bullet_points.append(bullet_text)
            
            # If we found bullet points
            if bullet_points:
                # Create a chunk for section header
                header = section_name
                header_chunk = {
                    "text": header,
                    "section": section_name.lower(),
                    "type": "header",
                    "importance": 3
                }
                chunks.append(header_chunk)
                
                # Process bullet points - create chunks from related bullets
                current_chunk = []
                current_chunk_len = 0
                
                for bullet in bullet_points:
                    bullet_len = len(bullet.split())
                    
                    # If adding this bullet would make chunk too large, save current and start new
                    if current_chunk and current_chunk_len + bullet_len > 100:
                        chunk_text = " ".join(current_chunk)
                        chunks.append({
                            "text": chunk_text,
                            "section": section_name.lower(),
                            "type": "bullet_group",
                            "importance": 2
                        })
                        current_chunk = [bullet]
                        current_chunk_len = bullet_len
                    else:
                        current_chunk.append(bullet)
                        current_chunk_len += bullet_len
                
                # Don't forget the last chunk
                if current_chunk:
                    chunk_text = " ".join(current_chunk)
                    chunks.append({
                        "text": chunk_text,
                        "section": section_name.lower(),
                        "type": "bullet_group",
                        "importance": 2
                    })
            else:
                # No bullet points found, use sentence-based chunking
                sentences = sent_tokenize(section_content)
                
                # Create a chunk for section header
                header = section_name
                header_chunk = {
                    "text": header,
                    "section": section_name.lower(),
                    "type": "header",
                    "importance": 3
                }
                chunks.append(header_chunk)
                
                # Create chunks of related sentences
                current_chunk = []
                current_chunk_len = 0
                
                for sentence in sentences:
                    sentence_len = len(sentence.split())
                    
                    # If adding this sentence would make chunk too large, save current and start new
                    if current_chunk and current_chunk_len + sentence_len > 100:
                        chunk_text = " ".join(current_chunk)
                        chunks.append({
                            "text": chunk_text,
                            "section": section_name.lower(),
                            "type": "text_group",
                            "importance": 2
                        })
                        current_chunk = [sentence]
                        current_chunk_len = sentence_len
                    else:
                        current_chunk.append(sentence)
                        current_chunk_len += sentence_len
                
                # Don't forget the last chunk
                if current_chunk:
                    chunk_text = " ".join(current_chunk)
                    chunks.append({
                        "text": chunk_text,
                        "section": section_name.lower(),
                        "type": "text_group",
                        "importance": 2
                    })
        
        return chunks

    def process_resume(self, file_path: str) -> None:
        """
        Process a resume PDF file with improved chunking and section recognition.
        
        Args:
            file_path: Path to the PDF resume file
        """
        # Check if file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Resume file not found: {file_path}")
        
        self.file_path = file_path
        print(f"{Fore.CYAN}Processing resume: {os.path.basename(file_path)}")
            
        try:
            # Extract text from PDF
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                    
            self.raw_text = text
            
            # Extract metadata
            self.resume_metadata = self._extract_metadata(text)
            if self.resume_metadata:
                print(f"{Fore.GREEN}Found resume metadata:")
                for key, value in self.resume_metadata.items():
                    print(f"  {Fore.YELLOW}{key}: {Fore.WHITE}{value}")
            
            # Extract sections
            self.sections = self._extract_sections(text)
            if self.sections:
                print(f"{Fore.GREEN}Identified {len(self.sections)} resume sections:")
                for section in self.sections:
                    print(f"  {Fore.YELLOW}{section}")
            else:
                # If no sections found, create a single generic section
                print(f"{Fore.YELLOW}No specific sections identified. Processing as a single document.")
                self.sections = {"Resume": text}
            
            # Create chunks
            self.chunks = self._create_chunks()
            print(f"{Fore.GREEN}Created {len(self.chunks)} semantic chunks for retrieval")
            
            # Create embeddings for chunks
            print(f"{Fore.BLUE}Generating embeddings...")
            texts = [chunk["text"] for chunk in self.chunks]
            self.embeddings = self.model.encode(texts, show_progress_bar=False)
            
            print(f"{Fore.GREEN}Resume processing complete!")
            
        except Exception as e:
            print(f"{Fore.RED}Error processing resume: {str(e)}")
            raise
    
    def answer_question(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Answer a question about the resume using the RAG approach.
        
        Args:
            question: The question to answer
            top_k: Number of chunks to retrieve
            
        Returns:
            Dictionary with answer and supporting chunks
        """
        if not self.embeddings is not None:
            raise ValueError("No resume processed yet. Call process_resume first.")
        
        # Generate embedding for the question
        question_embedding = self.model.encode([question])[0]
        
        # Get similarity scores
        scores = []
        for i, chunk_embedding in enumerate(self.embeddings):
            # Calculate cosine similarity
            similarity = util.cos_sim([question_embedding], [chunk_embedding])[0][0].item()
            
            # Apply section weighting based on question type
            chunk = self.chunks[i]
            section = chunk.get("section", "").lower()
            weight = self.section_weights.get(section, 1.0)
            
            # Apply weighting
            weighted_score = similarity * weight
            
            scores.append((i, weighted_score, similarity))
        
        # Sort by weighted score
        sorted_scores = sorted(scores, key=lambda x: x[1], reverse=True)
        
        # Get top-k chunks
        top_chunks = []
        for i, weighted_score, raw_score in sorted_scores[:top_k]:
            chunk = self.chunks[i].copy()
            chunk["weighted_score"] = weighted_score
            chunk["raw_score"] = raw_score
            top_chunks.append(chunk)
        
        # Prepare result
        result = {
            "question": question,
            "top_chunks": top_chunks,
        }
        
        return result

    def process_text_resume(self, text: str) -> None:
        """
        Process a resume from text directly.
        
        Args:
            text: The resume text
        """
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix='.txt', mode='w+', delete=False) as f:
            f.write(text)
            temp_path = f.name
        
        try:
            self.raw_text = text
            
            # Extract metadata
            self.resume_metadata = self._extract_metadata(text)
            if self.resume_metadata:
                print(f"{Fore.GREEN}Found resume metadata:")
                for key, value in self.resume_metadata.items():
                    print(f"  {Fore.YELLOW}{key}: {Fore.WHITE}{value}")
            
            # Extract sections
            self.sections = self._extract_sections(text)
            if self.sections:
                print(f"{Fore.GREEN}Identified {len(self.sections)} resume sections:")
                for section in self.sections:
                    print(f"  {Fore.YELLOW}{section}")
            else:
                # If no sections found, create a single generic section
                print(f"{Fore.YELLOW}No specific sections identified. Processing as a single document.")
                self.sections = {"Resume": text}
            
            # Create chunks
            self.chunks = self._create_chunks()
            print(f"{Fore.GREEN}Created {len(self.chunks)} semantic chunks for retrieval")
            
            # Create embeddings for chunks
            print(f"{Fore.BLUE}Generating embeddings...")
            texts = [chunk["text"] for chunk in self.chunks]
            self.embeddings = self.model.encode(texts, show_progress_bar=False)
            
            print(f"{Fore.GREEN}Resume processing complete!")
            
        except Exception as e:
            print(f"{Fore.RED}Error processing resume: {str(e)}")
            raise
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

def run_interactive_mode(resume_path: str = None):
    """Run the resume chatbot in interactive mode."""
    # Print welcome banner
    print(f"{Fore.CYAN}{'=' * 80}")
    print(f"{Fore.CYAN}{' ' * 30}RESUME RAG CHATBOT{' ' * 30}")
    print(f"{Fore.CYAN}{'=' * 80}")
    print(f"{Fore.YELLOW}A powerful RAG-based chatbot for querying resume information")
    print(f"{Fore.CYAN}{'=' * 80}\n")
    
    # Initialize bot
    bot = ResumeRAGBot()
    
    # Process resume if provided
    if resume_path:
        try:
            if resume_path.lower().endswith('.pdf'):
                bot.process_resume(resume_path)
            else:
                # Try to read as text file
                with open(resume_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                bot.process_text_resume(text)
        except Exception as e:
            print(f"{Fore.RED}Failed to process resume: {str(e)}")
            sys.exit(1)
    else:
        # Ask for resume path
        while True:
            print(f"\n{Fore.YELLOW}Please provide a resume file path (PDF or TXT):")
            path = input(f"{Fore.GREEN}> ")
            
            if path.lower() == 'exit':
                print(f"{Fore.CYAN}Exiting. Goodbye!")
                sys.exit(0)
                
            if os.path.exists(path):
                try:
                    if path.lower().endswith('.pdf'):
                        bot.process_resume(path)
                        break
                    else:
                        # Try to read as text file
                        with open(path, 'r', encoding='utf-8') as f:
                            text = f.read()
                        bot.process_text_resume(text)
                        break
                except Exception as e:
                    print(f"{Fore.RED}Failed to process resume: {str(e)}")
            else:
                print(f"{Fore.RED}File not found. Please try again or type 'exit' to quit.")
    
    # Main interaction loop
    print(f"\n{Fore.CYAN}Resume loaded and processed. You can now ask questions!")
    print(f"{Fore.YELLOW}Example questions:")
    print(f"  - What are their technical skills?")
    print(f"  - Where did they work previously?")
    print(f"  - What projects have they completed?")
    print(f"  - What is their education background?")
    print(f"  - Do they have experience with AWS?")
    print(f"{Fore.YELLOW}Type 'exit' to quit.\n")
    
    while True:
        try:
            # Get user question
            question = input(f"{Fore.GREEN}Question: {Style.RESET_ALL}")
            
            if question.lower() in ['exit', 'quit', 'q']:
                print(f"{Fore.CYAN}Exiting. Goodbye!")
                break
                
            if not question.strip():
                continue
                
            # Get answer
            result = bot.answer_question(question)
            top_chunks = result['top_chunks']
            
            print(f"\n{Fore.CYAN}{'=' * 80}")
            print(f"{Fore.YELLOW}Top results for: {question}")
            print(f"{Fore.CYAN}{'=' * 80}\n")
            
            if not top_chunks:
                print(f"{Fore.RED}No relevant information found in the resume.")
            else:
                for i, chunk in enumerate(top_chunks, 1):
                    # Format the chunk text
                    text = chunk['text']
                    score = chunk['weighted_score'] * 100  # Convert to percentage
                    section = chunk.get('section', 'unknown')
                    
                    # Print the chunk with formatting
                    print(f"{Fore.CYAN}[{i}] {Fore.YELLOW}Section: {section.title()} {Fore.BLUE}(Relevance: {score:.1f}%)")
                    
                    # Format and print the text with wrapping
                    wrapped_text = textwrap.fill(text, width=80, initial_indent='    ', subsequent_indent='    ')
                    print(f"{Fore.WHITE}{wrapped_text}\n")
            
            print(f"{Fore.CYAN}{'=' * 80}\n")
            
        except KeyboardInterrupt:
            print(f"\n{Fore.CYAN}Exiting. Goodbye!")
            break
        except Exception as e:
            print(f"{Fore.RED}Error: {str(e)}")

if __name__ == "__main__":
    # Handle command line arguments
    if len(sys.argv) > 1:
        resume_path = sys.argv[1]
        run_interactive_mode(resume_path)
    else:
        run_interactive_mode()