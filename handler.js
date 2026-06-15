import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { fileURLToPath } from 'url';
import path, { join } from 'path';
import { unwatchFile, watchFile } from 'fs';
import fs from 'fs';
import chalk from 'chalk';

/**
 * Enhanced message object wrapper for easier access to message properties
 * @param {Object} conn - Connection object
 * @param {Object} m - Raw message object
 * @returns {Object} Enhanced message object
 */
export function smsg(conn, m) {
    if (!m) return m;
    
    const M = m.constructor;
    
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') || m.id.length === 16 || m.id.startsWith('3EB0');
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat?.endsWith('@g.us') || false;
        m.sender = m.fromMe ? conn.user.jid : m.key.participant || m.key.remoteJid;
        m.sender = m.sender?.split(':')[0] || m.sender;
    }
    
    if (m.message) {
        m.type = Object.keys(m.message)[0];
        m.msg = m.message[m.type];
        
        // Extract text content
        if (m.type === 'extendedTextMessage' && m.msg.text) {
            m.text = m.msg.text;
        } else if (m.type === 'conversation') {
            m.text = m.msg;
        } else if (m.type === 'imageMessage' && m.msg.caption) {
            m.text = m.msg.caption;
        } else if (m.type === 'videoMessage' && m.msg.caption) {
            m.text = m.msg.caption;
        } else if (m.type === 'buttonsResponseMessage') {
            m.text = m.msg.selectedButtonId;
        } else if (m.type === 'templateButtonReplyMessage') {
            m.text = m.msg.selectedId;
        } else if (m.type === 'listResponseMessage') {
            m.text = m.msg.singleSelectReply?.selectedRowId;
        } else {
            m.text = '';
        }
        
        // Extract quoted message if exists
        const quoted = m.msg.contextInfo?.quotedMessage;
        if (quoted) {
            m.quoted = { type: Object.keys(quoted)[0] };
            m.quoted.msg = quoted[m.quoted.type];
            
            if (m.quoted.type === 'extendedTextMessage' && m.quoted.msg.text) {
                m.quoted.text = m.quoted.msg.text;
            } else if (m.quoted.type === 'conversation') {
                m.quoted.text = m.quoted.msg;
            } else if (m.quoted.type === 'imageMessage' && m.quoted.msg.caption) {
                m.quoted.text = m.quoted.msg.caption;
            } else if (m.quoted.type === 'videoMessage' && m.quoted.msg.caption) {
                m.quoted.text = m.quoted.msg.caption;
            }
            
            m.quoted.sender = m.msg.contextInfo.participant || m.msg.contextInfo.remoteJid;
            m.quoted.fromMe = m.quoted.sender === conn.user.jid;
            m.quoted.id = m.msg.contextInfo.stanzaId;
        }
    }
    
    // Helper reply function
    m.reply = (text, quoted = null, options = {}) => {
        return conn.sendMessage(m.chat, { text, ...options }, { quoted: quoted || m, ...options });
    };
    
    // Helper send function
    m.send = (content, options = {}) => {
        return conn.sendMessage(m.chat, content, options);
    };
    
    return m;
}

/**
 * Default prefix options
 */
const DEFAULT_PREFIXES = ['.', '/', '!'];

/**
 * Main handler function for processing incoming messages
 * @param {Object} chatUpdate - Chat update object from Baileys
 * @returns {Promise<void>}
 */
export async function handler(chatUpdate) {
    // Validate input
    if (!chatUpdate || !chatUpdate.messages || !chatUpdate.messages.length) {
        return;
    }
    
    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;
    
    try {
        // Enhance message object
        m = smsg(this, m);
        if (!m) return;
        
        // Skip if no text or empty message
        if (!m.text || m.text.trim() === '') return;
        
        // Skip bot's own messages
        if (m.fromMe) return;
        
        // Get group metadata for group messages
        let groupMetadata = null;
        let isAdmin = false;
        let isBotAdmin = false;
        let participants = [];
        
        if (m.isGroup) {
            try {
                // Fetch group metadata
                groupMetadata = await this.groupMetadata(m.chat).catch(err => {
                    console.error(`Failed to get group metadata for ${m.chat}:`, err);
                    return null;
                });
                
                if (groupMetadata && groupMetadata.participants) {
                    participants = groupMetadata.participants;
                    
                    // Check if sender is admin
                    const senderParticipant = participants.find(p => 
                        p.id === m.sender || p.jid === m.sender
                    );
                    isAdmin = senderParticipant?.admin === 'admin' || 
                             senderParticipant?.admin === 'superadmin' || false;
                    
                    // Check if bot is admin
                    const botParticipant = participants.find(p => 
                        p.id === this.user.jid || p.jid === this.user.jid
                    );
                    isBotAdmin = botParticipant?.admin === 'admin' || 
                                botParticipant?.admin === 'superadmin' || false;
                }
            } catch (err) {
                console.error(`Error processing group metadata for ${m.chat}:`, err);
            }
        }
        
        // Check for command prefix
        const prefixes = global.prefix || DEFAULT_PREFIXES;
        let usedPrefix = null;
        let commandText = null;
        let args = [];
        
        // Find which prefix was used
        for (const prefix of prefixes) {
            if (m.text.startsWith(prefix)) {
                usedPrefix = prefix;
                const fullCommand = m.text.slice(prefix.length).trim();
                const parts = fullCommand.split(/\s+/);
                commandText = parts[0].toLowerCase();
                args = parts.slice(1);
                break;
            }
        }
        
        // If no prefix found, skip command processing
        if (!usedPrefix || !commandText) return;
        
        // Check if plugins exist
        if (!global.plugins || typeof global.plugins !== 'object') {
            console.warn('No plugins loaded');
            return;
        }
        
        // Prepare context object for plugins
        const context = {
            conn: this,
            m: m,
            args: args,
            command: commandText,
            fullText: m.text,
            prefix: usedPrefix,
            groupMetadata: groupMetadata,
            participants: participants,
            isAdmin: isAdmin,
            isBotAdmin: isBotAdmin,
            isGroup: m.isGroup,
            sender: m.sender,
            chat: m.chat,
            timestamp: Date.now()
        };
        
        // Find and execute matching plugin
        let pluginExecuted = false;
        
        for (const [pluginName, plugin] of Object.entries(global.plugins)) {
            if (!plugin || plugin.disabled) continue;
            
            // Check if plugin handles this command
            let matches = false;
            
            if (typeof plugin.command === 'string') {
                matches = plugin.command.toLowerCase() === commandText;
            } else if (Array.isArray(plugin.command)) {
                matches = plugin.command.some(cmd => 
                    cmd.toLowerCase() === commandText
                );
            } else if (plugin.command instanceof RegExp) {
                matches = plugin.command.test(commandText);
            } else if (typeof plugin.command === 'function') {
                matches = await plugin.command(commandText, context);
            }
            
            if (!matches) continue;
            
            // Check plugin requirements
            if (plugin.groupOnly && !m.isGroup) {
                await m.reply('❌ This command can only be used in groups.');
                continue;
            }
            
            if (plugin.privateOnly && m.isGroup) {
                await m.reply('❌ This command can only be used in private chats.');
                continue;
            }
            
            if (plugin.adminOnly && !isAdmin) {
                await m.reply('❌ You need to be a group admin to use this command.');
                continue;
            }
            
            if (plugin.botAdminOnly && !isBotAdmin) {
                await m.reply('❌ Bot needs to be a group admin to use this command.');
                continue;
            }
            
            if (plugin.ownerOnly && !global.owner?.includes(m.sender)) {
                await m.reply('❌ This command is only for bot owners.');
                continue;
            }
            
            // Execute plugin
            try {
                pluginExecuted = true;
                console.log(`[HANDLER] Executing plugin: ${pluginName} for command: ${commandText}`);
                
                if (typeof plugin.execute === 'function') {
                    await plugin.execute(context);
                } else if (typeof plugin === 'function') {
                    await plugin(context);
                } else if (typeof plugin.run === 'function') {
                    await plugin.run(context);
                } else {
                    console.error(`Plugin ${pluginName} has no executable function`);
                }
                
                break; // Stop after first matching plugin
            } catch (pluginError) {
                console.error(`[HANDLER] Error executing plugin ${pluginName}:`, pluginError);
                await m.reply(`❌ An error occurred while executing the command: ${pluginError.message}`);
                // Don't break - continue to next plugin? Or break? We'll break to avoid confusion
                break;
            }
        }
        
        // Optional: Log if no plugin found
        if (!pluginExecuted && process.env.DEBUG === 'true') {
            console.log(`[HANDLER] No plugin found for command: ${commandText}`);
        }
        
    } catch (error) {
        // Global error handler - prevents crashes
        console.error('[HANDLER] Critical error in message handler:', error);
        
        // Try to notify user if possible
        try {
            if (m && m.reply) {
                await m.reply('❌ An unexpected error occurred. Please try again later.');
            }
        } catch (replyError) {
            console.error('[HANDLER] Failed to send error message:', replyError);
        }
    }
}

/**
 * Helper function to validate and parse group participants
 * @param {Object} metadata - Group metadata
 * @returns {Object} Parsed participant information
 */
export function parseGroupParticipants(metadata) {
    if (!metadata || !metadata.participants) {
        return { participants: [], adminList: [], participantJids: [] };
    }
    
    const participants = metadata.participants;
    const adminList = participants
        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
        .map(p => p.id || p.jid);
    
    const participantJids = participants.map(p => p.id || p.jid);
    
    return {
        participants,
        adminList,
        participantJids,
        metadata
    };
}

/**
 * Helper function to check if a user is admin
 * @param {Object} metadata - Group metadata
 * @param {string} jid - User JID to check
 * @returns {boolean}
 */
export function isUserAdmin(metadata, jid) {
    if (!metadata || !metadata.participants) return false;
    
    const participant = metadata.participants.find(p => 
        (p.id === jid || p.jid === jid)
    );
    
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

/**
 * Helper function to check if bot is admin
 * @param {Object} metadata - Group metadata
 * @param {string} botJid - Bot's JID
 * @returns {boolean}
 */
export function isBotAdmin(metadata, botJid) {
    return isUserAdmin(metadata, botJid);
}

export default { handler, smsg, parseGroupParticipants, isUserAdmin, isBotAdmin };
