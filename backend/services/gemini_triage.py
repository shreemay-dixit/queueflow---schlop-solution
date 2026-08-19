import os
import json
from typing import Dict, Any, Optional
from ..models.schemas import TriageResult, BusinessConfig

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "MY_GEMINI_API_KEY" or not api_key.strip():
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception:
        return None

def fallback_rule_based_triage(text: str, config: BusinessConfig) -> TriageResult:
    lower = text.lower()
    
    # Cancellation intent detection
    if any(w in lower for w in ['cancel', 'hata do', 'chhod do', 'nahi chahiye', 'drop', 'leave queue', 'exit']):
        return TriageResult(
            intent='cancel',
            priority_score=1,
            queue_type=config.queueTypes[0].id if config.queueTypes else 'general',
            reason='Customer requested ticket cancellation or queue withdrawal.',
            language='Hinglish' if 'hata' in lower or 'mera' in lower else 'English',
            reply_message='Your ticket has been cancelled. Any freed slot will be offered to the next person waiting.',
            confidence=0.96
        )
        
    # Clinic emergencies
    if config.id == 'apex_clinic':
        if any(w in lower for w in ['chest pain', 'heart', 'chhati', 'breathing', 'stroke', 'blood', 'accident', 'fainted', 'asthma', 'rash', 'fever', '103']):
            return TriageResult(
                intent='join_queue',
                priority_score=5,
                queue_type='emergency',
                reason='Acute medical condition detected requiring immediate clinical attention.',
                language='English',
                reply_message='Urgent priority ticket issued. Please head directly to Emergency Bay 1.',
                confidence=0.98,
                urgency_factors=['acute_symptoms', 'clinical_risk']
            )
        if any(w in lower for w in ['prescription', 'refill', 'dawai', 'report', 'checkup']):
            return TriageResult(
                intent='join_queue',
                priority_score=2,
                queue_type='general_consult',
                reason='Routine consultation or prescription inquiry.',
                language='English',
                reply_message='Ticket created for consultation. Please take a seat in the waiting lounge.',
                confidence=0.92
            )
            
    # Bank rules
    if config.id == 'metro_bank':
        if any(w in lower for w in ['fraud', 'stolen', 'chori', 'lost card', 'hack', 'block', 'unauthorized']):
            return TriageResult(
                intent='join_queue',
                priority_score=5,
                queue_type='teller',
                reason='Urgent security/fraud risk reported (stolen card or unauthorized activity).',
                language='English',
                reply_message='Security alert registered. Advancing you directly to the next teller.',
                confidence=0.97,
                urgency_factors=['financial_fraud_risk']
            )
        if any(w in lower for w in ['loan', 'mortgage', 'business', 'wealth', 'investment', 'llc']):
            return TriageResult(
                intent='join_queue',
                priority_score=3,
                queue_type='wealth',
                reason='Commercial banking or wealth management appointment.',
                language='English',
                reply_message='Ticket created for Wealth & Business desk.',
                confidence=0.91
            )
            
    # Civic hub
    if config.id == 'civic_hub':
        if any(w in lower for w in ['license', 'licence', 'driving', 'duplicate', 'renewal']):
            return TriageResult(
                intent='join_queue',
                priority_score=3,
                queue_type='licensing',
                reason='Driver license renewal or duplicate document issuance.',
                language='Hinglish' if 'mera' in lower or 'chahiye' in lower else 'English',
                reply_message='Aapka licensing appointment queue me add ho gaya hai.',
                confidence=0.94
            )
            
    return TriageResult(
        intent='join_queue',
        priority_score=config.queueTypes[0].defaultPriority if config.queueTypes else 2,
        queue_type=config.queueTypes[0].id if config.queueTypes else 'general',
        reason=f'Standard intake for {config.name}.',
        language='English',
        reply_message=f'Welcome to {config.name}. Your ticket has been generated.',
        confidence=0.88
    )

async def evaluate_triage(text: str, config: BusinessConfig) -> TriageResult:
    client = get_gemini_client()
    if not client:
        return fallback_rule_based_triage(text, config)
        
    system_instruction = f"""
You are the AI Triage Engine for {config.name}.
Tagline: {config.tagline}
Operational Instructions:
{config.systemTriageInstructions}

Available Queue Types:
{json.dumps([q.dict() for q in config.queueTypes], indent=2)}

Task:
Evaluate the user's natural language input (which may be in English, Hindi, Hinglish, Spanish, or mixed dialects).
Determine:
1. intent: 'join_queue' | 'cancel' | 'inquiry' | 'status_check'
2. priority_score: Integer from 1 (lowest) to 5 (critical emergency / urgent security)
3. queue_type: One of the available queue IDs.
4. reason: Brief, 1-2 sentence explainable justification for the assigned priority.
5. language: Detected input language.
6. reply_message: Short polite message to the user in their language.
7. confidence: Number between 0.0 and 1.0.
8. urgency_factors: Optional list of urgency markers.
"""
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=text,
            config={
                'system_instruction': system_instruction,
                'response_mime_type': 'application/json',
                'temperature': 0.1,
            }
        )
        data = json.loads(response.text)
        return TriageResult(**data)
    except Exception:
        return fallback_rule_based_triage(text, config)
