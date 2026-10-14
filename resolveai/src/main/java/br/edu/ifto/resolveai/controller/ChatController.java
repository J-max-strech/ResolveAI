
package br.edu.ifto.resolveai.controller;

import br.edu.ifto.resolveai.dto.ChatRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

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
