package com.example.sosmesh.mesh

import com.example.sosmesh.data.SosMessage

class GossipEngine {
    
    fun filterRelayableMessages(messages: List<SosMessage>): List<SosMessage> {
        // Only relay messages that haven't been delivered and haven't exceeded TTL
        return messages.filter { !it.isDelivered && it.hop < it.ttl }
    }
    
    fun getActiveMessageIdToAdvertise(messages: List<SosMessage>): ByteArray? {
        val relayable = filterRelayableMessages(messages)
        if (relayable.isEmpty()) return null
        
        // Pick the newest message to advertise its hash
        // In a full implementation, we'd cycle through them or use a Bloom filter
        val newest = relayable.maxByOrNull { it.timestamp }
        return newest?.msgId?.toByteArray(Charsets.UTF_8)?.take(4)?.toByteArray()
    }
    
    fun incrementHops(messages: List<SosMessage>): List<SosMessage> {
        return messages.map { msg ->
            msg.copy(hop = msg.hop + 1)
        }
    }
}
