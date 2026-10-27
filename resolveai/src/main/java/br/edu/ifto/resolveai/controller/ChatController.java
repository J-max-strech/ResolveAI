
package br.edu.ifto.resolveai.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import br.edu.ifto.resolveai.dto.ChatRequest;

@RestController
public class ChatController {

    @GetMapping("/api/chat")
    public String testarChat() {
        return "ResolveAI está funcionando!";
    }

    @PostMapping("/api/chat")
    public String receberPergunta(@RequestBody ChatRequest requisicao) {
        return "Sua pergunta foi recebida: "
                + requisicao.getPergunta();
    }
}
