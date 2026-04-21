from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from app.core.config import settings
import os

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_verification_email(email: str, token: str):
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Welcome to SpeechCoach!</h2>
        <p>Thank you for signing up. Please verify your email address to get started.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{verification_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
        </div>
        <p>If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{verification_url}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    """
    
    message = MessageSchema(
        subject="Verify your SpeechCoach account",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_reset_password_email(email: str, token: str):
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4f46e5;">Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <p>The link will expire in 24 hours.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #999;">SpeechCoach Security Team</p>
    </div>
    """
    
    message = MessageSchema(
        subject="Reset your SpeechCoach password",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)
